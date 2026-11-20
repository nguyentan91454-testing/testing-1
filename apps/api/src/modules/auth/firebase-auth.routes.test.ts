import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import { SignJWT } from "jose";
import type { AddressInfo } from "node:net";
import { errorHandler } from "../../http/errors.js";
import { getR2Client } from "../../lib/r2.js";
import { FilesystemAvatarStorage } from "./customer-avatar-storage.js";

const { db, config, firebase } = vi.hoisted(() => ({
  db: {
    user: { create: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    customerSession: { create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
  config: {
    NODE_ENV: "test", JWT_ACCESS_SECRET: "a-test-secret-at-least-32-characters-long", FIREBASE_PROJECT_ID: "firebase-project",
    R2_ACCOUNT_ID: "", R2_ACCESS_KEY_ID: "test-access", R2_SECRET_ACCESS_KEY: "test-secret",
    R2_PUBLIC_BUCKET: "test-catalog", R2_PRIVATE_BUCKET: "test-avatars",
  },
  firebase: { verifyFirebaseIdToken: vi.fn() },
}));
vi.mock("../../config/env.js", () => ({ env: config }));
vi.mock("../../lib/prisma.js", () => ({ prisma: db }));
vi.mock("../../lib/logger.js", () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock("./firebase-auth.js", () => ({ readFirebaseBearer: (request: { get(name: string): string | undefined }) => request.get("authorization")?.replace(/^Bearer\s+/i, ""), verifyFirebaseIdToken: firebase.verifyFirebaseIdToken }));
vi.mock("../email/email.service.js", () => ({ sendVerificationEmail: vi.fn() }));

const { customerAuthRouter } = await import("./customer-auth.routes.js");
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/auth", customerAuthRouter);
app.use(errorHandler);
const userId = "00000000-0000-4000-8000-000000000001";
const sessionId = "00000000-0000-4000-8000-000000000002";
const identity = { firebaseUid: "firebase-user-1", email: "person@example.test", name: "Firebase User", avatarUrl: null, emailVerified: true, provider: "google.com" };
const existingUser = { id: userId, ...identity, firebaseUid: identity.firebaseUid, passwordHash: null, googleSub: null, emailVerifiedAt: new Date(), status: "ACTIVE",
  phone: null, province: null, ward: null, addressDetail: null };
let server: ReturnType<typeof app.listen>;
let baseUrl: string;

beforeAll(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/auth`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
beforeEach(() => {
  vi.resetAllMocks();
  config.FIREBASE_PROJECT_ID = "firebase-project";
  firebase.verifyFirebaseIdToken.mockResolvedValue(identity);
  db.user.findUnique.mockResolvedValue(null);
  db.user.create.mockResolvedValue(existingUser);
  db.user.update.mockResolvedValue(existingUser);
  db.customerSession.create.mockResolvedValue({ id: sessionId });
  db.customerSession.findFirst.mockResolvedValue({ id: sessionId, userId });
  db.$transaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));
});

async function login() {
  return fetch(`${baseUrl}/firebase`, { method: "POST", headers: { authorization: "Bearer firebase-id-token", "content-type": "application/json" }, body: "{}" });
}

async function profileRequest(method: "GET" | "PATCH", body?: unknown, authenticated = true) {
  const token = await new SignJWT({ role: "customer" }).setProtectedHeader({ alg: "HS256" })
    .setSubject(userId).setJti(sessionId).setExpirationTime("1h").sign(new TextEncoder().encode(config.JWT_ACCESS_SECRET));
  return fetch(baseUrl + (method === "GET" ? "/me" : "/profile"), {
    method, headers: { "content-type": "application/json", ...(authenticated ? { cookie: "customer_session=" + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("Customer avatar endpoint with R2", () => {
  const avatarKey = "00000000-0000-4000-8000-000000000039.png";
  async function requestAvatar() {
    const token = await new SignJWT({ role: "customer" }).setProtectedHeader({ alg: "HS256" })
      .setSubject(userId).setJti(sessionId).setExpirationTime("1h").sign(new TextEncoder().encode(config.JWT_ACCESS_SECRET));
    return fetch(baseUrl + "/avatar", { redirect: "manual", headers: { cookie: "customer_session=" + token } });
  }
  beforeEach(() => {
    config.R2_ACCOUNT_ID = "c".repeat(32);
    db.user.findUniqueOrThrow.mockResolvedValue({ avatarUrl: "/api/v1/auth/avatar", avatarStorageKey: avatarKey });
  });
  afterEach(() => {
    config.R2_ACCOUNT_ID = "";
    vi.restoreAllMocks();
  });

  it("redirects the authenticated customer to a short-lived R2 URL without caching", async () => {
    vi.spyOn(getR2Client()!, "send").mockResolvedValue(undefined);
    const response = await requestAvatar();
    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const url = new URL(response.headers.get("location")!);
    expect(url.pathname).toBe("/test-avatars/" + avatarKey);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(await response.text()).toBe("");
  });

  it("returns a clean image error if R2 is down and there is no local copy", async () => {
    vi.spyOn(getR2Client()!, "send").mockRejectedValue(new Error("internal provider error"));
    const response = await requestAvatar();
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ code: "AVATAR_NOT_FOUND" });
    expect((await profileRequest("GET")).status).toBe(200);
  });

  it("serves an existing local avatar while its R2 object is missing", async () => {
    const localKey = randomUUID() + ".png";
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const filesystem = new FilesystemAvatarStorage();
    await filesystem.save(localKey, bytes);
    try {
      db.user.findUniqueOrThrow.mockResolvedValue({ avatarUrl: "/api/v1/auth/avatar", avatarStorageKey: localKey });
      vi.spyOn(getR2Client()!, "send").mockRejectedValue({ $metadata: { httpStatusCode: 404 } });
      const response = await requestAvatar();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/png");
      expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    } finally {
      await filesystem.remove(localKey);
    }
  });
});

async function link(identityOverride: Partial<typeof identity> = {}) {
  const secret = new TextEncoder().encode(config.JWT_ACCESS_SECRET);
  const token = await new SignJWT({ role: "customer" }).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setJti(sessionId).setExpirationTime("1h").sign(secret);
  const currentUser = { ...existingUser, firebaseUid: null };
  db.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(currentUser);
  firebase.verifyFirebaseIdToken.mockResolvedValue({ ...identity, ...identityOverride });
  return fetch(`${baseUrl}/firebase`, { method: "POST", headers: { authorization: "Bearer firebase-id-token", cookie: `customer_session=${token}`, "content-type": "application/json" }, body: "{}" });
}

describe("Firebase customer authentication", () => {
  it("creates a verified customer and issues the existing session cookie", async () => {
    const response = await login();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: { id: userId, email: identity.email, phone: null, isNewAccount: true }, linked: false });
    expect(db.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ firebaseUid: identity.firebaseUid, email: identity.email, emailVerifiedAt: expect.any(Date) }) });
    expect(db.customerSession.create).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("uses verified Google ownership to claim an unverified email account and disables its unverified password", async () => {
    const unverifiedUser = { ...existingUser, firebaseUid: null, passwordHash: "unverified-password-hash", emailVerifiedAt: null };
    db.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(unverifiedUser);
    db.user.update.mockResolvedValue({ ...existingUser, passwordHash: null });

    const response = await login();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: { email: identity.email, isNewAccount: false }, linked: false });
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: expect.objectContaining({
      firebaseUid: identity.firebaseUid,
      emailVerifiedAt: expect.any(Date),
      passwordHash: null,
    }) });
    expect(db.customerSession.create).toHaveBeenCalledOnce();
    expect(db.customerSession.updateMany).toHaveBeenCalledWith({ where: { userId, revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });

  it("preserves the password and sessions of an already verified matching account", async () => {
    const verifiedUser = { ...existingUser, firebaseUid: null, passwordHash: "verified-password-hash" };
    db.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(verifiedUser);
    db.user.update.mockResolvedValue({ ...verifiedUser, firebaseUid: identity.firebaseUid });

    const response = await login();

    expect(response.status).toBe(200);
    expect(db.user.update.mock.calls[0]![0].data).not.toHaveProperty("passwordHash");
    expect(db.customerSession.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an invalid Firebase token without changing accounts", async () => {
    firebase.verifyFirebaseIdToken.mockRejectedValue(new Error("bad token"));
    const response = await login();
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "FIREBASE_TOKEN_INVALID" });
    expect(db.user.create).not.toHaveBeenCalled();
    expect(db.customerSession.create).not.toHaveBeenCalled();
  });

  it("links the matching Google identity to the current account without replacing its session", async () => {
    const response = await link();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ linked: true, data: { id: userId, isNewAccount: false } });
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: expect.objectContaining({ firebaseUid: identity.firebaseUid }) });
    expect(db.customerSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tokenHash: expect.any(String) }) }));
    expect(db.customerSession.create).not.toHaveBeenCalled();
  });

  it("refuses to link a Google identity with a different email", async () => {
    const response = await link({ email: "other@example.test" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "FIREBASE_EMAIL_MISMATCH" });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("returns a clear setup error when the Firebase project ID is missing", async () => {
    config.FIREBASE_PROJECT_ID = "";
    const response = await login();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "FIREBASE_NOT_CONFIGURED" });
  });

  it("preserves the edited name and address when an existing Google user signs in again", async () => {
    const savedUser = { ...existingUser, name: "Edited Name", phone: "0912345678", province: "HCM", ward: "Ben Thanh", addressDetail: "123 Main Street" };
    db.user.findUnique.mockResolvedValueOnce(savedUser);
    db.user.update.mockResolvedValue(savedUser);
    const response = await login();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({ name: savedUser.name, phone: savedUser.phone, addressDetail: savedUser.addressDetail, isNewAccount: false });
    expect(body.data).not.toHaveProperty("passwordHash");
    expect(body.data).not.toHaveProperty("firebaseUid");
    expect(db.user.update.mock.calls[0]![0].data).not.toHaveProperty("name");
    expect(db.user.update.mock.calls[0]![0].data).not.toHaveProperty("phone");
    expect(db.user.create).not.toHaveBeenCalled();
  });
});

describe("Customer profile", () => {
  it("returns the complete public profile without credentials", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue({ ...existingUser, phone: "0912345678", addressDetail: "123 Main Street" });
    const response = await profileRequest("GET");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({ id: userId, phone: "0912345678", addressDetail: "123 Main Street", province: null, ward: null });
    expect(body.data).not.toHaveProperty("passwordHash");
    expect(body.data).not.toHaveProperty("firebaseUid");
    expect(body.data).not.toHaveProperty("status");
  });

  it("updates only the signed-in customer's supplied fields and trims values", async () => {
    db.user.update.mockResolvedValue({ ...existingUser, name: "New Name", phone: "+84 912 345 678" });
    const response = await profileRequest("PATCH", { name: "  New Name  ", phone: " +84 912 345 678 " });
    expect(response.status).toBe(200);
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: { name: "New Name", phone: "+84 912 345 678" }, select: expect.objectContaining({ phone: true, addressDetail: true }) });
    const body = await response.json();
    expect(body.data).toMatchObject({ name: "New Name", phone: "+84 912 345 678" });
    expect(body.data).not.toHaveProperty("passwordHash");
  });

  it("clears optional fields with blank text or null without changing the name", async () => {
    const response = await profileRequest("PATCH", { phone: "  ", province: null, ward: "", addressDetail: null });
    expect(response.status).toBe(200);
    expect(db.user.update.mock.calls[0]![0].data).toEqual({ phone: null, province: null, ward: null, addressDetail: null });
  });

  it("allows a name-only update while leaving saved contact fields untouched", async () => {
    const response = await profileRequest("PATCH", { name: "Changed Name" });
    expect(response.status).toBe(200);
    expect(db.user.update.mock.calls[0]![0].data).toEqual({ name: "Changed Name" });
  });

  it("rejects anonymous profile changes", async () => {
    const response = await profileRequest("PATCH", { name: "Other Name" }, false);
    expect(response.status).toBe(401);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("rejects revoked or expired sessions before changing a profile", async () => {
    db.customerSession.findFirst.mockResolvedValue(null);
    const response = await profileRequest("PATCH", { name: "Other Name" });
    expect(response.status).toBe(401);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it.each([
    {}, { name: "" }, { name: null }, { name: "a" }, { phone: "abcdefghi" }, { phone: "1--------" },
    { phone: "01234567" }, { province: "a" }, { ward: "a" }, { addressDetail: "1234" },
    { province: "x".repeat(101) }, { ward: "x".repeat(101) }, { addressDetail: "x".repeat(501) },
    { email: "other@example.test" }, { firebaseUid: "attacker" }, { passwordHash: "attacker" },
    { id: "someone-else", name: "Changed Name" }, { status: "ACTIVE" },
  ])("rejects invalid or disallowed updates: %j", async (input) => {
    const response = await profileRequest("PATCH", input);
    expect(response.status).toBe(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("accepts a 500-character address matching checkout limits", async () => {
    const addressDetail = "x".repeat(500);
    const response = await profileRequest("PATCH", { addressDetail });
    expect(response.status).toBe(200);
    expect(db.user.update.mock.calls[0]![0].data).toEqual({ addressDetail });
  });
});
