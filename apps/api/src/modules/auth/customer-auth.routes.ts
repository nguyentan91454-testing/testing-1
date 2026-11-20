import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { errors as joseErrors, jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { env } from "../../config/env.js";
import { customerCookieName, customerCookieOptions, optionalCustomer, requireCustomer } from "../../http/customer-auth.js";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { hashSessionToken } from "./session-token.js";
import { readFirebaseBearer, verifyFirebaseIdToken } from "./firebase-auth.js";
import { sendVerificationEmail } from "../email/email.service.js";
import { customerProfileSelect, publicCustomer, updateProfileSchema } from "./customer-profile.js";
import { loadCustomerAvatar } from "./customer-avatar.js";
import multer from "multer";
import { avatarMimeExtension, avatarUploadLimit, getStoredAvatarUrl, readStoredAvatar, removeStoredAvatar, saveAvatar } from "./customer-avatar-storage.js";
import { logger } from "../../lib/logger.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const dummyPasswordHash = await argon2.hash("not-a-real-user-password");
const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
});
const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(120) });

export const customerAuthRouter = Router();
const rateLimitMessage = { success: false, message: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.", code: "RATE_LIMITED" };
const limiter = (limit: number) => rateLimit({ windowMs: 15 * 60_000, limit, standardHeaders: "draft-8", legacyHeaders: false, message: rateLimitMessage });
const firebaseLimiter = limiter(10);
const credentialsLimiter = limiter(10);
const verifyEmailLimiter = limiter(30);
const resendLimiter = limiter(3);
const setPasswordLimiter = limiter(5);
const changePasswordLimiter = limiter(5);

const verificationTokenLifetime = "24h";
const verificationToken = async (user: { id: string; email: string }) => new SignJWT({ purpose: "email-verification", email: user.email })
  .setProtectedHeader({ alg: "HS256" }).setAudience("email-verification").setSubject(user.id).setJti(randomUUID()).setIssuedAt().setExpirationTime(verificationTokenLifetime).sign(accessSecret);

async function createCustomerSession(userId: string) {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  const token = await new SignJWT({ role: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(accessSecret);
  await prisma.customerSession.create({ data: { id: sessionId, userId, tokenHash: hashSessionToken(token), expiresAt } });
  return token;
}

customerAuthRouter.post("/register", credentialsLimiter, async (request, response, next) => {
  try {
    const input = registerSchema.parse(request.body);
    const passwordHash = await argon2.hash(input.password);
    const user = await prisma.user.create({ data: { email: input.email, name: input.name, passwordHash, emailVerifiedAt: null } });
    let emailSent = true;
    try {
      await sendVerificationEmail({ email: user.email, name: user.name, token: await verificationToken(user) });
    } catch (error) {
      if (!(error instanceof HttpError) || error.code !== "VERIFICATION_EMAIL_UNAVAILABLE") throw error;
      emailSent = false;
    }
    response.status(201).json({ success: true, data: { verificationRequired: true, emailSent, email: user.email }, message: emailSent
      ? "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản."
      : "Tài khoản đã được tạo nhưng chưa thể gửi email xác minh. Vui lòng yêu cầu gửi lại email sau." });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      next(new HttpError(409, "Email này đã được đăng ký. Hãy đăng nhập bằng mật khẩu hoặc tiếp tục với Google.", "EMAIL_ALREADY_REGISTERED"));
      return;
    }
    next(error);
  }
});

customerAuthRouter.post("/login", credentialsLimiter, async (request, response, next) => {
  try {
    const input = credentialsSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (user && !user.passwordHash) throw new HttpError(401, "Tài khoản này được tạo bằng Google. Hãy đăng nhập bằng Google hoặc đặt mật khẩu trong phần Tài khoản.", "CREDENTIALS_NOT_SET");
    const valid = await argon2.verify(user?.passwordHash ?? dummyPasswordHash, input.password).catch(() => false);
    if (!user || !valid) throw new HttpError(401, "Email hoặc mật khẩu không đúng.", "INVALID_CREDENTIALS");
    if (!user.emailVerifiedAt) throw new HttpError(403, "Email chưa được xác minh. Vui lòng kiểm tra hộp thư hoặc yêu cầu gửi lại email xác minh.", "EMAIL_NOT_VERIFIED");
    if (user.status !== "ACTIVE") throw new HttpError(403, "Tài khoản này đã bị vô hiệu hóa.", "CUSTOMER_ACCOUNT_DISABLED");
    const token = await createCustomerSession(user.id);
    response.cookie(customerCookieName, token, customerCookieOptions);
    response.json({ success: true, data: publicCustomer(user) });
  } catch (error) { next(error); }
});

customerAuthRouter.post("/firebase", firebaseLimiter, optionalCustomer, async (request, response, next) => {
  try {
    if (!env.FIREBASE_PROJECT_ID) throw new HttpError(503, "Firebase Authentication chưa được cấu hình.", "FIREBASE_NOT_CONFIGURED");
    let identity;
    try {
      identity = await verifyFirebaseIdToken(readFirebaseBearer(request));
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(401, "Phiên đăng nhập Google qua Firebase không hợp lệ hoặc đã hết hạn.", "FIREBASE_TOKEN_INVALID");
    }
    const session = await prisma.$transaction(async (tx) => {
      let isNewAccount = false;
      let user = await tx.user.findUnique({ where: { firebaseUid: identity.firebaseUid } });
      if (request.customer) {
        const currentUser = await tx.user.findUnique({ where: { id: request.customer.id } });
        if (!currentUser) throw new HttpError(401, "Phiên đăng nhập không hợp lệ", "UNAUTHENTICATED");
        if (currentUser.email !== identity.email) throw new HttpError(409, "Vui lòng chọn tài khoản Google có cùng email với tài khoản hiện tại.", "FIREBASE_EMAIL_MISMATCH");
        if (user && user.id !== currentUser.id) throw new HttpError(409, "Tài khoản Google này đã được liên kết với tài khoản khác.", "FIREBASE_ACCOUNT_CONFLICT");
        if (currentUser.firebaseUid && currentUser.firebaseUid !== identity.firebaseUid) throw new HttpError(409, "Tài khoản này đã liên kết với một tài khoản Google khác.", "FIREBASE_ACCOUNT_CONFLICT");
        user = await tx.user.update({ where: { id: currentUser.id }, data: { firebaseUid: identity.firebaseUid, ...(currentUser.avatarStorageKey ? {} : { avatarUrl: identity.avatarUrl }), emailVerifiedAt: currentUser.emailVerifiedAt ?? new Date() } });
      } else if (!user) {
        user = await tx.user.findUnique({ where: { email: identity.email } });
        if (user?.firebaseUid && user.firebaseUid !== identity.firebaseUid) throw new HttpError(409, "Email này đã liên kết với tài khoản Google khác.", "FIREBASE_ACCOUNT_CONFLICT");
        if (user) {
          if (!user.emailVerifiedAt) {
            await tx.customerSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
          }
          user = await tx.user.update({ where: { id: user.id }, data: {
            firebaseUid: identity.firebaseUid,
            ...(user.avatarStorageKey ? {} : { avatarUrl: identity.avatarUrl }),
            emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
            ...(user.passwordHash && !user.emailVerifiedAt ? { passwordHash: null } : {}),
          } });
        } else {
          user = await tx.user.create({ data: { firebaseUid: identity.firebaseUid, email: identity.email, name: identity.name, avatarUrl: identity.avatarUrl, emailVerifiedAt: new Date() } });
          isNewAccount = true;
        }
      } else {
        user = await tx.user.update({ where: { id: user.id }, data: { ...(user.avatarStorageKey ? {} : { avatarUrl: identity.avatarUrl }), emailVerifiedAt: user.emailVerifiedAt ?? new Date() } });
      }
      if (user.status !== "ACTIVE") throw new HttpError(403, "Tài khoản này đã bị vô hiệu hóa.", "CUSTOMER_ACCOUNT_DISABLED");
      return { ...publicCustomer(user), isNewAccount };
    }, { isolationLevel: "Serializable" });
    if (!request.customer) response.cookie(customerCookieName, await createCustomerSession(session.id), customerCookieOptions);
    response.json({ success: true, data: session, linked: Boolean(request.customer) });
  } catch (error) { next(error); }
});

customerAuthRouter.get("/me", requireCustomer, async (request, response, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.customer!.id }, select: customerProfileSelect });
    response.json({ success: true, data: publicCustomer(user) });
  } catch (error) { next(error); }
});

customerAuthRouter.get("/avatar", requireCustomer, async (request, response, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.customer!.id }, select: { avatarUrl: true, avatarStorageKey: true } });
    response.setHeader("Cache-Control", "private, no-store");
    if (user.avatarStorageKey) {
      let signedUrl: string | null = null;
      try {
        signedUrl = await getStoredAvatarUrl(user.avatarStorageKey);
      } catch {
        logger.warn({ userId: request.customer!.id }, "Unable to sign customer avatar in R2");
      }
      if (signedUrl) {
        response.status(302).location(signedUrl).end();
        return;
      }
    }
    const avatar = user.avatarStorageKey ? await readStoredAvatar(user.avatarStorageKey) : await loadCustomerAvatar(user.avatarUrl);
    response.type(avatar.contentType).send(avatar.bytes);
  } catch (error) { next(error); }
});

const receiveAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: avatarUploadLimit(), files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!avatarMimeExtension(file.mimetype)) { callback(new Error("Unsupported avatar type")); return; }
    callback(null, true);
  },
}).single("avatar");

customerAuthRouter.post("/profile/avatar", requireCustomer, (request, response, next) => {
  receiveAvatar(request, response, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") { next(new HttpError(400, "Ảnh đại diện không được quá 5 MB.", "AVATAR_TOO_LARGE")); return; }
    if (error) { next(new HttpError(400, "Chỉ nhận ảnh JPEG, PNG hoặc WebP.", "AVATAR_INVALID")); return; }
    next();
  });
}, async (request, response, next) => {
  try {
    const file = request.file;
    if (!file) throw new HttpError(400, "Hãy chọn một ảnh đại diện.", "AVATAR_REQUIRED");
    const old = await prisma.user.findUniqueOrThrow({ where: { id: request.customer!.id }, select: { avatarStorageKey: true } });
    let key: string;
    try { key = await saveAvatar(file.buffer, file.mimetype); }
    catch (error) {
      if (error instanceof HttpError) throw error;
      logger.warn({ userId: request.customer!.id }, "Unable to store customer avatar");
      throw new HttpError(503, "Chưa thể lưu ảnh đại diện. Vui lòng thử lại.", "AVATAR_STORAGE_UNAVAILABLE");
    }
    try {
      const user = await prisma.user.update({ where: { id: request.customer!.id, avatarStorageKey: old.avatarStorageKey }, data: { avatarUrl: "/api/v1/auth/avatar", avatarStorageKey: key }, select: customerProfileSelect });
      try { await removeStoredAvatar(old.avatarStorageKey); } catch { logger.warn({ userId: request.customer!.id }, "Unable to remove previous customer avatar"); }
      response.json({ success: true, data: publicCustomer(user) });
    } catch (error) {
      try { await removeStoredAvatar(key); } catch { logger.warn({ userId: request.customer!.id }, "Unable to clean up uploaded customer avatar"); }
      throw error;
    }
  } catch (error) { next(error); }
});

customerAuthRouter.delete("/profile/avatar", requireCustomer, async (request, response, next) => {
  try {
    const userId = request.customer!.id;
    const user = await prisma.$transaction(async (tx) => {
      const old = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { avatarStorageKey: true } });
      const updated = await tx.user.update({ where: { id: userId, avatarStorageKey: old.avatarStorageKey }, data: { avatarUrl: null, avatarStorageKey: null }, select: customerProfileSelect });
      try { await removeStoredAvatar(old.avatarStorageKey); }
      catch {
        logger.warn({ userId }, "Unable to remove customer avatar object");
        throw new HttpError(503, "Chưa thể xóa ảnh đại diện. Vui lòng thử lại.", "AVATAR_STORAGE_UNAVAILABLE");
      }
      return updated;
    }, { timeout: 15_000 });
    response.json({ success: true, data: publicCustomer(user) });
  } catch (error) { next(error); }
});

customerAuthRouter.patch("/profile", requireCustomer, async (request, response, next) => {
  try {
    const input = updateProfileSchema.parse(request.body);
    // Only defined allowlisted fields reach Prisma; omitted values stay unchanged.
    const data = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
    const user = await prisma.user.update({ where: { id: request.customer!.id }, data, select: customerProfileSelect });
    response.json({ success: true, data: publicCustomer(user) });
  } catch (error) { next(error); }
});

customerAuthRouter.get("/verify-email", verifyEmailLimiter, async (request, response, next) => {
  try {
    const token = z.string().min(20).max(4096).parse(request.query.token);
    let payload;
    try {
      ({ payload } = await jwtVerify(token, accessSecret, { algorithms: ["HS256"], audience: "email-verification", requiredClaims: ["exp", "sub"] }));
    } catch (error) {
      if (!(error instanceof joseErrors.JOSEError)) throw error;
      throw new HttpError(400, "Liên kết xác minh email không hợp lệ hoặc đã hết hạn.", "EMAIL_VERIFICATION_INVALID");
    }
    const claims = z.object({ purpose: z.literal("email-verification"), sub: z.string().uuid(), email: z.string().email() }).safeParse(payload);
    if (!claims.success) throw new HttpError(400, "Liên kết xác minh email không hợp lệ hoặc đã hết hạn.", "EMAIL_VERIFICATION_INVALID");
    const updated = await prisma.user.updateMany({ where: { id: claims.data.sub, email: claims.data.email, emailVerifiedAt: null, status: "ACTIVE" }, data: { emailVerifiedAt: new Date() } });
    if (updated.count === 0) {
      const user = await prisma.user.findUnique({ where: { id: claims.data.sub }, select: { email: true, status: true, emailVerifiedAt: true } });
      if (!user?.emailVerifiedAt || user.email !== claims.data.email || user.status !== "ACTIVE") throw new HttpError(400, "Liên kết xác minh email không hợp lệ hoặc đã hết hạn.", "EMAIL_VERIFICATION_INVALID");
    }
    response.setHeader("Cache-Control", "no-store");
    if (request.accepts(["json", "html"]) === "html") {
      response.redirect(new URL("/login?email_verified=success", env.APP_BASE_URL).toString());
      return;
    }
    response.json({ success: true, message: "Email đã được xác minh. Bạn có thể đăng nhập." });
  } catch (error) { next(error); }
});

customerAuthRouter.post("/resend-verification", resendLimiter, async (request, response, next) => {
  try {
    const input = z.object({ email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()) }).parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true, email: true, name: true, status: true, emailVerifiedAt: true, passwordHash: true } });
    if (user && user.status === "ACTIVE" && user.passwordHash && !user.emailVerifiedAt) await sendVerificationEmail({ email: user.email, name: user.name, token: await verificationToken(user) });
    response.json({ success: true, message: "Nếu email tồn tại và cần xác minh, email mới sẽ được gửi đến bạn." });
  } catch (error) { next(error); }
});

customerAuthRouter.post("/set-password", setPasswordLimiter, requireCustomer, async (request, response, next) => {
  try {
    const { password } = z.object({ password: z.string().min(8).max(200) }).parse(request.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.customer!.id }, select: { passwordHash: true, googleSub: true, firebaseUid: true, emailVerifiedAt: true } });
    if (user.passwordHash) throw new HttpError(409, "Tài khoản đã có mật khẩu. Hãy dùng chức năng đổi mật khẩu.", "PASSWORD_ALREADY_SET");
    if ((!user.googleSub && !user.firebaseUid) || !user.emailVerifiedAt) throw new HttpError(403, "Vui lòng xác minh email trước khi đặt mật khẩu.", "EMAIL_NOT_VERIFIED");
    const providers = [...(user.googleSub ? [{ googleSub: user.googleSub }] : []), ...(user.firebaseUid ? [{ firebaseUid: user.firebaseUid }] : [])];
    const updated = await prisma.user.updateMany({ where: { id: request.customer!.id, passwordHash: null, emailVerifiedAt: { not: null }, OR: providers }, data: { passwordHash: await argon2.hash(password) } });
    if (updated.count !== 1) throw new HttpError(409, "Thông tin tài khoản vừa thay đổi. Vui lòng tải lại trang.", "ACCOUNT_CHANGED");
    response.json({ success: true, message: "Đã đặt mật khẩu thành công." });
  } catch (error) { next(error); }
});

customerAuthRouter.post("/change-password", changePasswordLimiter, requireCustomer, async (request, response, next) => {
  try {
    const input = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(8).max(200) }).parse(request.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.customer!.id }, select: { passwordHash: true } });
    if (!user.passwordHash || !(await argon2.verify(user.passwordHash, input.currentPassword).catch(() => false))) throw new HttpError(401, "Mật khẩu hiện tại không đúng.", "INVALID_CURRENT_PASSWORD");
    const passwordHash = await argon2.hash(input.newPassword);
    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({ where: { id: request.customer!.id, passwordHash: user.passwordHash }, data: { passwordHash } });
      if (updated.count !== 1) throw new HttpError(409, "Mật khẩu vừa thay đổi. Vui lòng thử lại.", "ACCOUNT_CHANGED");
      await tx.customerSession.updateMany({ where: { userId: request.customer!.id, id: { not: request.customer!.sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    response.json({ success: true, message: "Đã đổi mật khẩu thành công." });
  } catch (error) { next(error); }
});

customerAuthRouter.get("/providers", requireCustomer, async (request, response, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.customer!.id }, select: { email: true, passwordHash: true, googleSub: true, firebaseUid: true } });
    const googleLinked = Boolean(user.googleSub || user.firebaseUid);
    response.json({ success: true, data: { providers: [{ type: "credentials", linked: Boolean(user.passwordHash) }, { type: "google", linked: googleLinked, ...(googleLinked ? { email: user.email } : {}) }] } });
  } catch (error) { next(error); }
});

customerAuthRouter.delete("/providers/google", requireCustomer, async (request, response, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.customer!.id }, select: { passwordHash: true, googleSub: true, firebaseUid: true } });
    if (!user.passwordHash) throw new HttpError(400, "Bạn cần đặt mật khẩu trước khi gỡ liên kết Google", "GOOGLE_UNLINK_REQUIRES_PASSWORD");
    const updated = await prisma.user.updateMany({ where: { id: request.customer!.id, passwordHash: { not: null }, emailVerifiedAt: { not: null } }, data: { googleSub: null, firebaseUid: null } });
    if (updated.count !== 1) throw new HttpError(409, "Thông tin tài khoản vừa thay đổi. Vui lòng tải lại trang.", "ACCOUNT_CHANGED");
    response.json({ success: true, message: "Đã gỡ liên kết Google." });
  } catch (error) { next(error); }
});

customerAuthRouter.post("/logout", requireCustomer, async (request, response, next) => {
  try {
    await prisma.customerSession.updateMany({ where: { id: request.customer!.sessionId, userId: request.customer!.id, revokedAt: null }, data: { revokedAt: new Date() } });
    response.clearCookie(customerCookieName, { ...customerCookieOptions, maxAge: undefined });
    response.json({ success: true });
  } catch (error) { next(error); }
});
