import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { recordAdminChange } from "./admin-audit.js";
import { assertOrderTransition } from "../orders/order-state.js";
import { notifyEmailWorker, recordOrderEmail } from "../email/email.service.js";
import { createMockShipment } from "../shipping/mock-shipping.js";

export const adminShippingRouter = Router();

adminShippingRouter.get("/orders/:orderId/shipment", async (request, response, next) => {
  try {
    const { orderId } = z.object({ orderId: z.string().uuid() }).parse(request.params);
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) throw new HttpError(404, "Order not found", "ORDER_NOT_FOUND");

    const shipment = await prisma.shipment.findUnique({ where: { orderId } });
    if (!shipment) throw new HttpError(404, "Shipment not found", "SHIPMENT_NOT_FOUND");
    response.json({ success: true, data: shipment });
  } catch (error) { next(error); }
});

adminShippingRouter.post("/orders/:orderId/shipment", async (request, response, next) => {
  try {
    const { orderId } = z.object({ orderId: z.string().uuid() }).parse(request.params);
    z.object({}).strict().parse(request.body ?? {});

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          code: true,
          email: true,
          orderStatus: true,
          paymentStatus: true,
          depositRequiredVnd: true,
          shippingFeeGrossVnd: true,
          codAmountVnd: true,
          shipment: { select: { id: true } },
        },
      });
      if (!order) throw new HttpError(404, "Order not found", "ORDER_NOT_FOUND");
      if (order.shipment) throw new HttpError(409, "A shipment already exists for this order", "SHIPMENT_ALREADY_EXISTS");
      if (order.orderStatus !== "PACKING") throw new HttpError(409, "Order must be PACKING before a shipment can be created", "ORDER_NOT_READY_TO_SHIP");

      try {
        assertOrderTransition({
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          requiresDeposit: order.depositRequiredVnd > 0,
        }, "SHIPPED");
      } catch (error) {
        throw new HttpError(409, error instanceof Error ? error.message : "Order cannot be shipped", "ORDER_NOT_READY_TO_SHIP");
      }

      const changed = await tx.order.updateMany({
        where: { id: orderId, orderStatus: "PACKING", paymentStatus: order.paymentStatus },
        data: { orderStatus: "SHIPPED" },
      });
      if (changed.count !== 1) throw new HttpError(409, "Order changed concurrently; reload and retry", "ORDER_CHANGED_CONCURRENTLY");

      const label = createMockShipment({
        orderCode: order.code,
        shippingFeeGrossVnd: order.shippingFeeGrossVnd,
        codAmountVnd: order.codAmountVnd,
      });
      const shipment = await tx.shipment.create({ data: { orderId, ...label } });
      await tx.orderEvent.create({
        data: {
          orderId,
          type: "STATUS_CHANGED",
          fromStatus: "PACKING",
          toStatus: "SHIPPED",
          actor: `admin:${request.admin!.id}`,
          payload: { shipmentId: shipment.id, trackingCode: shipment.trackingCode, provider: shipment.provider },
        },
      });
      const emailLogId = await recordOrderEmail(tx, orderId, "ORDER_SHIPPED", order.email);
      await recordAdminChange(tx, {
        adminId: request.admin!.id,
        action: "SHIPMENT_CREATED",
        entity: "Shipment",
        entityId: shipment.id,
        after: { orderId, provider: shipment.provider, trackingCode: shipment.trackingCode, codAmountVnd: shipment.codAmountVnd },
      });
      return { shipment, emailLogId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await notifyEmailWorker(result.emailLogId);
    response.status(201).json({ success: true, data: result.shipment });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      next(new HttpError(409, "A shipment already exists for this order", "SHIPMENT_ALREADY_EXISTS"));
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      next(new HttpError(409, "Order changed concurrently; reload and retry", "ORDER_CHANGED_CONCURRENTLY"));
      return;
    }
    next(error);
  }
});
