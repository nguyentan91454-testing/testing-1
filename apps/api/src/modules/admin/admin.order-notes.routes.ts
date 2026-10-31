import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { recordAdminChange } from "./admin-audit.js";

export const adminOrderNotesRouter = Router();

adminOrderNotesRouter.post("/orders/:orderId/notes", async (request, response, next) => {
  try {
    const { orderId } = z.object({ orderId: z.string().uuid() }).parse(request.params);
    const { content } = z.object({ content: z.string().trim().min(1).max(5000) }).parse(request.body);
    const note = await prisma.$transaction(async (tx) => {
      if (!await tx.order.findUnique({ where: { id: orderId }, select: { id: true } })) {
        throw new HttpError(404, "Không tìm thấy đơn hàng", "ORDER_NOT_FOUND");
      }
      const created = await tx.orderNote.create({ data: { orderId, content, actor: `admin:${request.admin!.id}` } });
      await tx.orderEvent.create({ data: {
        orderId,
        type: "INTERNAL_NOTE_ADDED",
        actor: `admin:${request.admin!.id}`,
        payload: { noteId: created.id },
      } });
      await recordAdminChange(tx, {
        adminId: request.admin!.id,
        action: "ORDER_NOTE_CREATED",
        entity: "OrderNote",
        entityId: created.id,
        after: { orderId, actor: created.actor },
      });
      return created;
    });
    response.status(201).json({ success: true, data: note });
  } catch (error) { next(error); }
});
