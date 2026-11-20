import type { OrderStatus as DbOrderStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { assertOrderTransition, type OrderStatus, type PaymentStatus } from "./order-state.js";
import { notifyEmailWorker, recordOrderEmail } from "../email/email.service.js";

export async function transitionOrderStatus(input: {
  orderId: string;
  nextStatus: OrderStatus;
  actor: string;
  reasonCode?: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: input.orderId } });
    assertOrderTransition({
      orderStatus: order.orderStatus as OrderStatus,
      paymentStatus: order.paymentStatus as PaymentStatus,
      requiresDeposit: order.depositRequiredVnd > 0,
      ...(input.reasonCode === undefined ? {} : { reasonCode: input.reasonCode }),
    }, input.nextStatus);

    const restoresStock = input.nextStatus === "CANCELLED" || input.nextStatus === "RETURNED";
    const requiresRefund = restoresStock && order.paidVnd > 0;
    const pendingPayment = ["DEPOSIT_PENDING", "COD_PENDING"].includes(order.paymentStatus);
    const changed = await tx.order.updateMany({
      where: { id: input.orderId, orderStatus: order.orderStatus as DbOrderStatus },
      data: {
        orderStatus: input.nextStatus,
        ...(pendingPayment && restoresStock ? { paymentStatus: "EXPIRED" as const } : {}),
        ...(input.nextStatus === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      },
    });
    if (changed.count !== 1) throw new Error("Order changed concurrently; reload and retry");

    let stockRestored = 0;
    if (restoresStock) {
      const items = await tx.orderItem.findMany({ where: { orderId: input.orderId }, select: { variantId: true, quantity: true } });
      for (const item of items) {
        const restored = await tx.variant.updateMany({ where: { id: item.variantId }, data: { stockQty: { increment: item.quantity } } });
        if (restored.count !== 1) throw new Error(`Unable to restore stock for order ${input.orderId}`);
        stockRestored += item.quantity;
      }
      await tx.payment.updateMany({
        where: { orderId: input.orderId, status: "PENDING" },
        data: { status: "FAILED", rawPayload: { reason: input.nextStatus === "RETURNED" ? "ORDER_RETURNED" : "ORDER_CANCELLED" } },
      });
    }

    await tx.orderEvent.create({
      data: {
        orderId: input.orderId,
        type: "STATUS_CHANGED",
        fromStatus: order.orderStatus,
        toStatus: input.nextStatus,
        actor: input.actor,
        payload: {
          ...(input.reasonCode === undefined ? {} : { reasonCode: input.reasonCode }),
          ...(restoresStock ? { stockRestored, refundRequired: requiresRefund } : {}),
        },
      },
    });
    const emailType = input.nextStatus === "SHIPPED" ? "ORDER_SHIPPED" : input.nextStatus === "CANCELLED" ? "ORDER_CANCELLED" : null;
    const emailLogId = emailType ? await recordOrderEmail(tx, order.id, emailType, order.email) : null;
    return { order: await tx.order.findUniqueOrThrow({ where: { id: input.orderId } }), emailLogId };
  });
  if (result.emailLogId) await notifyEmailWorker(result.emailLogId);
  return result.order;
}

