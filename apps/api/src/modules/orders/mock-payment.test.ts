import { describe, expect, it } from "vitest";
import { buildMockVietQr, getMockPaymentStatus } from "./mock-payment.js";

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
});
