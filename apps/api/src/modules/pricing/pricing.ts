export type Discount =
  | { kind: "percent"; value: number; maxDiscountVnd: number | null; minSubtotalVnd: number }
  | { kind: "fixed"; valueVnd: number; minSubtotalVnd: number };

export interface PriceInput {
  subtotalVnd: number;
  shippingFeeGrossVnd: number;
  freeShippingThresholdVnd: number | null;
  shippingSubsidyCapVnd: number | null;
  discount: Discount | null;
}

export interface PriceBreakdown {
  subtotalVnd: number;
  discountVnd: number;
  shippingFeeGrossVnd: number;
  shippingSubsidyVnd: number;
  shippingFeeCustomerVnd: number;
  totalVnd: number;
}

const assertVnd = (value: number, name: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative safe integer`);
};

export function calculatePrice(input: PriceInput): PriceBreakdown {
  assertVnd(input.subtotalVnd, "subtotalVnd");
  assertVnd(input.shippingFeeGrossVnd, "shippingFeeGrossVnd");
  if (input.freeShippingThresholdVnd !== null) assertVnd(input.freeShippingThresholdVnd, "freeShippingThresholdVnd");
  if (input.shippingSubsidyCapVnd !== null) assertVnd(input.shippingSubsidyCapVnd, "shippingSubsidyCapVnd");

  let discountVnd = 0;
  if (input.discount && input.subtotalVnd >= input.discount.minSubtotalVnd) {
    assertVnd(input.discount.minSubtotalVnd, "discount.minSubtotalVnd");
    if (input.discount.kind === "fixed") {
      assertVnd(input.discount.valueVnd, "discount.valueVnd");
      discountVnd = Math.min(input.discount.valueVnd, input.subtotalVnd);
    } else {
      if (input.discount.maxDiscountVnd !== null) assertVnd(input.discount.maxDiscountVnd, "discount.maxDiscountVnd");
      if (!Number.isSafeInteger(input.discount.value) || input.discount.value < 0 || input.discount.value > 100) {
        throw new RangeError("discount.value must be an integer from 0 to 100");
      }
      const rawDiscount = Number((BigInt(input.subtotalVnd) * BigInt(input.discount.value)) / 100n);
      discountVnd = Math.min(rawDiscount, input.discount.maxDiscountVnd ?? rawDiscount, input.subtotalVnd);
    }
  }

  const qualifiesForFreeShipping = input.freeShippingThresholdVnd !== null && input.subtotalVnd >= input.freeShippingThresholdVnd;
  const availableSubsidy = qualifiesForFreeShipping ? input.shippingFeeGrossVnd : 0;
  const shippingSubsidyVnd = input.shippingSubsidyCapVnd === null
    ? availableSubsidy
    : Math.min(availableSubsidy, input.shippingSubsidyCapVnd);
  const shippingFeeCustomerVnd = input.shippingFeeGrossVnd - shippingSubsidyVnd;
  const totalVnd = input.subtotalVnd - discountVnd + shippingFeeCustomerVnd;
  assertVnd(totalVnd, "totalVnd");

  return {
    subtotalVnd: input.subtotalVnd,
    discountVnd,
    shippingFeeGrossVnd: input.shippingFeeGrossVnd,
    shippingSubsidyVnd,
    shippingFeeCustomerVnd,
    totalVnd,
  };
}

