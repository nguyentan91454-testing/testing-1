import { describe, expect, it } from "vitest";
import { buildMockVietQr, createOrderTrackingToken, getMockPaymentStatus, hashOrderTrackingToken, matchesOrderTrackingToken, verifyOrderTrackingToken } from "./mock-payment.js";

describe("mock VietQR", () => {
  it("returns a deterministic demo payload and an encoded QR image URL", () => {
    const qr = buildMockVietQr("DEMO-ABC-123", 125_000);
    const imageUrl = new URL(qr.imageUrl);
    expect(qr.mode).toBe("DEMO");
    expect(qr.payload).toBe("DEMO-VIETQR|DEMO-ABC-123|125000");
    expect(imageUrl.searchParams.get("data")).toBe(qr.payload);
  });

  it("marks full payments as paid and partial payments as deposit paid", () => {
    expect(getMockPaymentStatus(100_000, 0, 100_000)).toBe("PAID");
    expect(getMockPaymentStatus(100_000, 0, 30_000)).toBe("DEPOSIT_PAID");
  });

  it("creates a signed tracking token that expires and is stored by hash", () => {
    const orderId = "00000000-0000-4000-8000-000000000001";
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const tracking = createOrderTrackingToken(orderId, createdAt);
    expect(verifyOrderTrackingToken(tracking.token, new Date("2026-01-15T00:00:00.000Z")))
      .toEqual({ orderId, expiresAt: tracking.expiresAt });
    expect(matchesOrderTrackingToken(tracking.token, hashOrderTrackingToken(tracking.token))).toBe(true);
    expect(matchesOrderTrackingToken(`${tracking.token}x`, hashOrderTrackingToken(tracking.token))).toBe(false);
    expect(verifyOrderTrackingToken(`${tracking.token}x`, new Date("2026-01-15T00:00:00.000Z"))).toBeNull();
    expect(verifyOrderTrackingToken(tracking.token, tracking.expiresAt)).toBeNull();
  });
});
