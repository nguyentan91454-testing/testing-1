import argon2 from "argon2";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { SignJWT } from "jose";
import { z } from "zod";
import { env } from "../../config/env.js";
import { requireAdmin } from "../../http/auth.js";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";

const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const cookieName = "admin_session";
const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "strict" as const, path: "/api/v1/admin", maxAge: 15 * 60 * 1000 };

export const adminAuthRouter = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false });

adminAuthRouter.post("/login", loginLimiter, async (request, response, next) => {
  try {
    const credentials = loginSchema.parse(request.body);
    const admin = await prisma.adminUser.findUnique({ where: { email: credentials.email.toLowerCase() } });
    const valid = admin?.isActive === true && await argon2.verify(admin.passwordHash, credentials.password).catch(() => false);
    if (!valid || !admin) throw new HttpError(401, "Email hoặc mật khẩu không đúng", "INVALID_CREDENTIALS");

    const expiresAt = new Date(Date.now() + 15 * 60_000);
    const session = await prisma.adminSession.create({ data: { adminId: admin.id, expiresAt } });
    const token = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(admin.id)
      .setJti(session.id)
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(accessSecret);
    response.cookie(cookieName, token, cookieOptions);
    response.json({ success: true, data: { id: admin.id, email: admin.email, role: admin.role }, message: "Đăng nhập thành công" });
  } catch (error) {
    next(error);
  }
});

adminAuthRouter.post("/logout", requireAdmin, async (request, response, next) => {
  try {
    await prisma.adminSession.update({ where: { id: request.admin!.sessionId }, data: { revokedAt: new Date() } });
    response.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
    response.json({ success: true, message: "Đã đăng xuất" });
  } catch (error) {
    next(error);
  }
});

adminAuthRouter.get("/me", requireAdmin, async (request, response, next) => {
  try {
    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: request.admin!.id }, select: { id: true, email: true, role: true } });
    response.json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
});

