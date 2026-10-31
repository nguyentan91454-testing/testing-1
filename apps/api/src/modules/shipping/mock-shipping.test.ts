import { describe, expect, it } from "vitest";
import { createMockShipment } from "./mock-shipping.js";

describe("mock shipping adapter", () => {
  it("creates a demo label while preserving the order charges", () => {
    const shipment = createMockShipment({
      orderCode: "ORD-1001",
      shippingFeeGrossVnd: 35_000,
      codAmountVnd: 420_000,
      now: new Date("2026-10-31T10:00:00.000Z"),
    });

    expect(shipment).toMatchObject({
      provider: "MOCK",
      trackingCode: expect.stringMatching(/^MOCK-20261031-[A-F0-9]{8}$/),
      status: "CREATED",
      feeGrossVnd: 35_000,
      codAmountVnd: 420_000,
      rawPayload: { demo: true, orderCode: "ORD-1001", estimatedDeliveryDays: 3 },
    });
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects invalid monetary values: %s", (amount) => {
    expect(() => createMockShipment({ orderCode: "ORD-1001", shippingFeeGrossVnd: amount, codAmountVnd: 0 })).toThrow(RangeError);
    expect(() => createMockShipment({ orderCode: "ORD-1001", shippingFeeGrossVnd: 0, codAmountVnd: amount })).toThrow(RangeError);
  });
});
