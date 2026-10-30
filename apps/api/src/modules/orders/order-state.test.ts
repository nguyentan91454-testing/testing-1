import { describe, expect, it } from "vitest";
import { assertOrderTransition, calculateCodAmount } from "./order-state.js";

describe("order state rules", () => {
  it("requires deposit payment before shipment when the order requires a deposit", () => {
    expect(() => assertOrderTransition({ orderStatus: "PACKING", paymentStatus: "DEPOSIT_PENDING", requiresDeposit: true }, "SHIPPED")).toThrow(/Deposit/);
    expect(() => assertOrderTransition({ orderStatus: "PACKING", paymentStatus: "DEPOSIT_PAID", requiresDeposit: true }, "SHIPPED")).not.toThrow();
  });

  it("requires a reason code when marking an order returned", () => {
    expect(() => assertOrderTransition({ orderStatus: "SHIPPED", paymentStatus: "COD_PENDING", requiresDeposit: false }, "RETURNED")).toThrow(/reason code/);
  });

  it("rejects invalid transitions", () => {
    expect(() => assertOrderTransition({ orderStatus: "DELIVERED", paymentStatus: "PAID", requiresDeposit: false }, "PACKING")).toThrow(/Invalid order transition/);
  });

  it("calculates COD as total minus amount already paid", () => {
    expect(calculateCodAmount(1_500_000, 450_000)).toBe(1_050_000);
    expect(calculateCodAmount(1_500_000, 1_500_000)).toBe(0);
  });
});

