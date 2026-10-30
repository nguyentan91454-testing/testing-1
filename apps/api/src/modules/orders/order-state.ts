export type OrderStatus = "PENDING" | "CONFIRMED" | "PACKING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED" | "COMPLAINT";
export type PaymentStatus = "UNPAID" | "DEPOSIT_PENDING" | "DEPOSIT_PAID" | "PARTIALLY_PAID" | "PAID" | "COD_PENDING" | "COD_COLLECTED" | "EXPIRED";

export interface TransitionContext {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  requiresDeposit: boolean;
  reasonCode?: string;
}

export class OrderTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderTransitionError";
  }
}

export function assertOrderTransition(context: TransitionContext, next: OrderStatus): void {
  const allowed: Record<OrderStatus, readonly OrderStatus[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PACKING", "CANCELLED", "COMPLAINT"],
    PACKING: ["SHIPPED", "CANCELLED", "COMPLAINT"],
    SHIPPED: ["DELIVERED", "RETURNED", "COMPLAINT"],
    DELIVERED: ["COMPLAINT"],
    CANCELLED: [],
    RETURNED: [],
    COMPLAINT: ["PACKING", "SHIPPED", "DELIVERED", "RETURNED"],
  };
  if (!allowed[context.orderStatus].includes(next)) throw new OrderTransitionError(`Invalid order transition: ${context.orderStatus} -> ${next}`);
  if (next === "SHIPPED" && context.requiresDeposit && !["DEPOSIT_PAID", "PAID"].includes(context.paymentStatus)) {
    throw new OrderTransitionError("Deposit must be paid before shipment");
  }
  if (next === "RETURNED" && !context.reasonCode?.trim()) throw new OrderTransitionError("A reason code is required to return an order");
}

export function calculateCodAmount(totalVnd: number, paidVnd: number): number {
  if (!Number.isSafeInteger(totalVnd) || !Number.isSafeInteger(paidVnd) || totalVnd < 0 || paidVnd < 0 || paidVnd > totalVnd) {
    throw new RangeError("Amounts must be valid non-negative integer VND and paid cannot exceed total");
  }
  return totalVnd - paidVnd;
}

