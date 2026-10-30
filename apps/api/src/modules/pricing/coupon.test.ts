import { describe, expect, it } from "vitest";
import { couponDiscount, couponIdentityHashes, normalizeCouponCode } from "./coupon.js";

describe("coupon helpers", () => {
  it("normalizes codes independent of case and surrounding whitespace", () => {
    expect(normalizeCouponCode("  hello2026 ")).toBe("HELLO2026");
  });

  it("creates stable hashes for equivalent phone and address input", () => {
    expect(couponIdentityHashes({ phone: "090 123 4567", address: "  12 Nguyễn Huệ  " }))
      .toEqual(couponIdentityHashes({ phone: "0901234567", address: "12 Nguyễn Huệ" }));
  });

  it("maps percent and fixed coupons to the shared pricing contract", () => {
    expect(couponDiscount({ type: "PERCENT", value: 15, maxDiscountVnd: 100_000, minOrderVnd: 500_000 }))
      .toEqual({ kind: "percent", value: 15, maxDiscountVnd: 100_000, minSubtotalVnd: 500_000 });
    expect(couponDiscount({ type: "FIXED", value: 25_000, maxDiscountVnd: null, minOrderVnd: 100_000 }))
      .toEqual({ kind: "fixed", valueVnd: 25_000, minSubtotalVnd: 100_000 });
  });
});
