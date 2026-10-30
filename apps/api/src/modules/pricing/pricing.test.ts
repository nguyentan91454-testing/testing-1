import { describe, expect, it } from "vitest";
import { calculatePrice } from "./pricing.js";

describe("calculatePrice", () => {
  const base = { subtotalVnd: 2_000_000, shippingFeeGrossVnd: 80_000, freeShippingThresholdVnd: 1_000_000, shippingSubsidyCapVnd: 50_000, discount: null };

  it("applies percentage discounts capped in whole VND", () => {
    expect(calculatePrice({ ...base, discount: { kind: "percent", value: 10, maxDiscountVnd: 100_000, minSubtotalVnd: 0 } })).toMatchObject({ discountVnd: 100_000, totalVnd: 1_930_000 });
  });

  it("does not apply discounts below the minimum subtotal", () => {
    expect(calculatePrice({ ...base, subtotalVnd: 99_999, discount: { kind: "fixed", valueVnd: 10_000, minSubtotalVnd: 100_000 } }).discountVnd).toBe(0);
  });

  it("does not discount more than the subtotal", () => {
    expect(calculatePrice({ ...base, subtotalVnd: 500, discount: { kind: "fixed", valueVnd: 10_000, minSubtotalVnd: 0 } }).discountVnd).toBe(500);
  });

  it("caps freeship subsidy and charges the excess shipping", () => {
    expect(calculatePrice(base)).toMatchObject({ shippingSubsidyVnd: 50_000, shippingFeeCustomerVnd: 30_000 });
  });

  it("rejects fractional VND inputs", () => {
    expect(() => calculatePrice({ ...base, subtotalVnd: 10.5 })).toThrow(RangeError);
  });
});

