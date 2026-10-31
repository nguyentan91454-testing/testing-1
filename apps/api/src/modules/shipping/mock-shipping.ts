import { randomUUID } from "node:crypto";

export interface MockShipmentInput {
  orderCode: string;
  shippingFeeGrossVnd: number;
  codAmountVnd: number;
  now?: Date;
}

export function createMockShipment(input: MockShipmentInput) {
  if (!Number.isSafeInteger(input.shippingFeeGrossVnd) || input.shippingFeeGrossVnd < 0) {
    throw new RangeError("Shipping fee must be a non-negative integer VND amount");
  }
  if (!Number.isSafeInteger(input.codAmountVnd) || input.codAmountVnd < 0) {
    throw new RangeError("COD amount must be a non-negative integer VND amount");
  }

  const createdAt = input.now ?? new Date();
  const trackingCode = `MOCK-${createdAt.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  return {
    provider: "MOCK",
    trackingCode,
    status: "CREATED",
    feeGrossVnd: input.shippingFeeGrossVnd,
    codAmountVnd: input.codAmountVnd,
    rawPayload: {
      demo: true,
      orderCode: input.orderCode,
      acceptedAt: createdAt.toISOString(),
      estimatedDeliveryDays: 3,
    },
  };
}
