import { Prisma } from "@prisma/client";
import { PgBoss } from "pg-boss";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";

const queueName = "expire-order-reservations";

export function isReservationExpired(input: {
  orderStatus: string;
  paymentStatus: string;
  reservationExpiresAt: Date | null;
}, now: Date): boolean {
  return input.orderStatus === "PENDING"
    && input.paymentStatus === "DEPOSIT_PENDING"
    && input.reservationExpiresAt !== null
    && input.reservationExpiresAt <= now;
}

export async function expireExpiredReservations(now = new Date()): Promise<number> {
  const candidates = await prisma.order.findMany({
    where: {
      orderStatus: "PENDING",
      paymentStatus: "DEPOSIT_PENDING",
      reservationExpiresAt: { lte: now },
    },
    select: { id: true, reservationExpiresAt: true, orderStatus: true, paymentStatus: true },
    orderBy: { reservationExpiresAt: "asc" },
    take: 100,
  });

  let expiredCount = 0;
  for (const candidate of candidates) {
    if (!isReservationExpired(candidate, now)) continue;
    const expired = await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: {
          id: candidate.id,
          orderStatus: "PENDING",
          paymentStatus: "DEPOSIT_PENDING",
          reservationExpiresAt: { lte: now },
        },
        data: { orderStatus: "CANCELLED", paymentStatus: "EXPIRED" },
      });
      if (changed.count !== 1) return false;

      const items = await tx.orderItem.findMany({ where: { orderId: candidate.id }, select: { variantId: true, quantity: true } });
      for (const item of items) {
        const restored = await tx.variant.updateMany({ where: { id: item.variantId }, data: { stockQty: { increment: item.quantity } } });
        if (restored.count !== 1) throw new Error(`Unable to restore reserved stock for order ${candidate.id}`);
      }
      await tx.payment.updateMany({ where: { orderId: candidate.id, status: "PENDING" }, data: { status: "FAILED", rawPayload: { reason: "RESERVATION_EXPIRED" } } });
      await tx.orderEvent.create({
        data: {
          orderId: candidate.id,
          type: "RESERVATION_EXPIRED",
          fromStatus: "PENDING",
          toStatus: "CANCELLED",
          actor: "system:reservation-worker",
          payload: { paymentStatus: "EXPIRED", stockRestored: items.length },
        },
      });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (expired) expiredCount += 1;
  }
  return expiredCount;
}

export async function startReservationWorker(): Promise<PgBoss> {
  const boss = new PgBoss(env.DATABASE_URL);
  boss.on("error", (error) => logger.error({ err: error }, "pg-boss error"));
  boss.on("warning", (warning) => logger.warn({ warning }, "pg-boss warning"));
  await boss.start();
  await boss.work(queueName, { batchSize: 1 }, async (jobs) => {
    const expiredCount = await expireExpiredReservations();
    logger.info({ jobId: jobs[0]?.id, expiredCount }, "Expired order reservations processed");
  });
  await boss.schedule(queueName, "* * * * *", {}, { key: "reservation-expiry-minute", missed: "once" });
  logger.info({ queueName }, "Reservation expiry worker started");
  return boss;
}
