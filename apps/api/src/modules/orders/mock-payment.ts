import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

const trackingTokenLifetimeSeconds = 30 * 24 * 60 * 60;

export function buildMockVietQr(orderCode: string, amountVnd: number) {
  const payload = `DEMO-VIETQR|${orderCode}|${amountVnd}`;
  const imageUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
  imageUrl.searchParams.set("size", "280x280");
  imageUrl.searchParams.set("data", payload);
  return { mode: "DEMO" as const, payload, imageUrl: imageUrl.toString() };
}

export function createOrderTrackingToken(orderId: string, createdAt: Date): { token: string; expiresAt: Date } {
  const expiresAt = new Date(createdAt.getTime() + trackingTokenLifetimeSeconds * 1000);
  const expiresAtSeconds = Math.floor(expiresAt.getTime() / 1000);
  const payload = `${orderId}.${expiresAtSeconds}`;
  const signature = createHmac("sha256", env.JWT_ACCESS_SECRET).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, expiresAt: new Date(expiresAtSeconds * 1000) };
}

export function hashOrderTrackingToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyOrderTrackingToken(token: string, now = new Date()): { orderId: string; expiresAt: Date } | null {
  if (token.length > 256) return null;
  const [orderId, rawExpiresAt, signature, ...extra] = token.split(".");
  if (extra.length || !orderId || !rawExpiresAt || !signature || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) return null;
  if (!/^\d{10}$/.test(rawExpiresAt)) return null;
  const expiresAtSeconds = Number(rawExpiresAt);
  if (!Number.isSafeInteger(expiresAtSeconds)) return null;
  const payload = `${orderId}.${expiresAtSeconds}`;
  const expected = createHmac("sha256", env.JWT_ACCESS_SECRET).update(payload).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, "base64url"); } catch { return null; }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  const expiresAt = new Date(expiresAtSeconds * 1000);
  if (expiresAt <= now) return null;
  return { orderId, expiresAt };
}

export function matchesOrderTrackingToken(token: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const actual = Buffer.from(hashOrderTrackingToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}

export function getMockPaymentStatus(totalVnd: number, paidVnd: number, paymentAmountVnd: number): "PAID" | "DEPOSIT_PAID" {
  if (![totalVnd, paidVnd, paymentAmountVnd].every(Number.isSafeInteger) || totalVnd < 0 || paidVnd < 0 || paymentAmountVnd <= 0) {
    throw new RangeError("Payment amounts must be valid non-negative integer VND");
  }
  return paidVnd + paymentAmountVnd >= totalVnd ? "PAID" : "DEPOSIT_PAID";
}
