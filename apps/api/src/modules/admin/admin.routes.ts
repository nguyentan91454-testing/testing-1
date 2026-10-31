import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../http/auth.js";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { transitionOrderStatus } from "../orders/order.service.js";
import { OrderTransitionError } from "../orders/order-state.js";
import { adminCatalogRouter } from "./admin.catalog.routes.js";
import { adminCommerceRouter } from "./admin.commerce.routes.js";
import { adminSettingsRouter } from "./admin.settings.routes.js";
import { adminReportsRouter } from "./admin.reports.routes.js";
import { lightingAdminRouter } from "../lighting/lighting.admin.routes.js";
import { chatbotAdminRouter } from "../chatbot/chatbot.admin.routes.js";
import { adminOrderNotesRouter } from "./admin.order-notes.routes.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.use(adminCatalogRouter);
adminRouter.use(adminCommerceRouter);
adminRouter.use("/settings", adminSettingsRouter);
adminRouter.use("/reports", adminReportsRouter);
adminRouter.use(lightingAdminRouter);
adminRouter.use(chatbotAdminRouter);
adminRouter.use(adminOrderNotesRouter);

adminRouter.get("/orders", async (request, response, next) => {
  try {
    const query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      q: z.string().trim().max(160).optional(),
      orderStatus: z.enum(["PENDING", "CONFIRMED", "PACKING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED", "COMPLAINT", "RETURN_REQUESTED", "REFUNDED"]).optional(),
      paymentStatus: z.enum(["UNPAID", "DEPOSIT_PENDING", "DEPOSIT_PAID", "PARTIALLY_PAID", "PAID", "COD_PENDING", "COD_COLLECTED", "EXPIRED"]).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    }).parse(request.query);
    if (query.from && query.to && query.from > query.to) throw new HttpError(400, "from must not be after to", "INVALID_ORDER_DATE_RANGE");
    const where: Prisma.OrderWhereInput = {
      ...(query.orderStatus ? { orderStatus: query.orderStatus } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}),
      ...(query.q ? { OR: [
        { code: { contains: query.q, mode: "insensitive" } },
        { customerName: { contains: query.q, mode: "insensitive" } },
        { phone: { contains: query.q } },
        { email: { contains: query.q, mode: "insensitive" } },
      ] } : {}),
    };
    const [data, total] = await prisma.$transaction([
      prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit, include: { items: true, payments: true, shipment: true, coupon: { select: { code: true } } } }),
      prisma.order.count({ where }),
    ]);
    response.json({ success: true, data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
  } catch (error) { next(error); }
});

adminRouter.get("/orders/:orderId", async (request, response, next) => {
  try {
    const { orderId } = z.object({ orderId: z.string().uuid() }).parse(request.params);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "desc" } }, shipment: true, coupon: { select: { id: true, code: true } }, notes: { orderBy: { createdAt: "desc" } }, complaints: { orderBy: { createdAt: "desc" } }, emailLogs: { select: { id: true, type: true, status: true, providerId: true, error: true, createdAt: true }, orderBy: { createdAt: "desc" } } },
    });
    if (!order) throw new HttpError(404, "Order not found", "ORDER_NOT_FOUND");
    response.json({ success: true, data: order });
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

