import { describe, expect, it } from "vitest";
import { isReservationExpired } from "./reservation-worker.js";

describe("reservation expiry", () => {
  const now = new Date("2026-10-31T12:00:00.000Z");

  it("expires pending prepayment orders at the deadline", () => {
    expect(isReservationExpired({ orderStatus: "PENDING", paymentStatus: "DEPOSIT_PENDING", reservationExpiresAt: now }, now)).toBe(true);
    expect(isReservationExpired({ orderStatus: "PENDING", paymentStatus: "DEPOSIT_PENDING", reservationExpiresAt: new Date(now.getTime() + 1) }, now)).toBe(false);
  });

  it("does not expire orders without a pending prepayment reservation", () => {
    expect(isReservationExpired({ orderStatus: "PENDING", paymentStatus: "PAID", reservationExpiresAt: now }, now)).toBe(false);
    expect(isReservationExpired({ orderStatus: "CANCELLED", paymentStatus: "DEPOSIT_PENDING", reservationExpiresAt: now }, now)).toBe(false);
    expect(isReservationExpired({ orderStatus: "PENDING", paymentStatus: "DEPOSIT_PENDING", reservationExpiresAt: null }, now)).toBe(false);
  });
});
