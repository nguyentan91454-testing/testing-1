import type { OrderStatus as DbOrderStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { assertOrderTransition, type OrderStatus, type PaymentStatus } from "./order-state.js";

export async function transitionOrderStatus(input: {
  orderId: string;
  nextStatus: OrderStatus;
  actor: string;
  reasonCode?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: input.orderId } });
    assertOrderTransition({
      orderStatus: order.orderStatus as OrderStatus,
      paymentStatus: order.paymentStatus as PaymentStatus,
      requiresDeposit: order.depositRequiredVnd > 0,
      ...(input.reasonCode === undefined ? {} : { reasonCode: input.reasonCode }),
    }, input.nextStatus);

    const changed = await tx.order.updateMany({
      where: { id: input.orderId, orderStatus: order.orderStatus as DbOrderStatus },
      data: {
        orderStatus: input.nextStatus,
        ...(input.nextStatus === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      },
    });
    if (changed.count !== 1) throw new Error("Order changed concurrently; reload and retry");

    await tx.orderEvent.create({
      data: {
        orderId: input.orderId,
        type: "STATUS_CHANGED",
        fromStatus: order.orderStatus,
        toStatus: input.nextStatus,
        actor: input.actor,
        ...(input.reasonCode === undefined ? {} : { payload: { reasonCode: input.reasonCode } }),
      },
    });
    return tx.order.findUniqueOrThrow({ where: { id: input.orderId } });
  });
}

