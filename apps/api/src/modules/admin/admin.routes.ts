import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../http/auth.js";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { transitionOrderStatus } from "../orders/order.service.js";
import { OrderTransitionError } from "../orders/order-state.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/orders", async (request, response, next) => {
  try {
    const query = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).parse(request.query);
    const where = {};
    const [data, total] = await prisma.$transaction([
      prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit, include: { items: true } }),
      prisma.order.count({ where }),
    ]);
    response.json({ success: true, data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
  } catch (error) { next(error); }
});

adminRouter.patch("/orders/:orderId/status", async (request, response, next) => {
  try {
    const { orderId } = z.object({ orderId: z.string().uuid() }).parse(request.params);
    const input = z.object({
      nextStatus: z.enum(["PENDING", "CONFIRMED", "PACKING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED", "COMPLAINT"]),
      reasonCode: z.string().trim().min(1).max(80).optional(),
    }).parse(request.body);
    const before = await prisma.order.findUnique({ where: { id: orderId }, select: { orderStatus: true } });
    if (!before) throw new HttpError(404, "Không tìm thấy đơn hàng", "ORDER_NOT_FOUND");
    const order = await transitionOrderStatus({ orderId, nextStatus: input.nextStatus, actor: `admin:${request.admin!.id}`, ...(input.reasonCode === undefined ? {} : { reasonCode: input.reasonCode }) });
    await prisma.auditLog.create({ data: { adminId: request.admin!.id, action: "ORDER_STATUS_CHANGED", entity: "Order", entityId: orderId, before: { orderStatus: before.orderStatus }, after: { orderStatus: order.orderStatus } } });
    response.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof OrderTransitionError) { next(new HttpError(409, error.message, "INVALID_ORDER_TRANSITION")); return; }
    next(error);
  }
});

