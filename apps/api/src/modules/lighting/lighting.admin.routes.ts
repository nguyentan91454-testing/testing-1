import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { recordAdminChange } from "../admin/admin-audit.js";

export const lightingAdminRouter = Router();
const roomTypeSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const lightingRuleSchema = z.object({ lumenPerM2: z.number().int().min(50).max(2000), notes: z.string().trim().max(1000).nullable().optional() });

lightingAdminRouter.get("/lighting-rules", async (_request, response, next) => {
  try {
    const data = await prisma.lightingRule.findMany({ orderBy: { roomType: "asc" } });
    response.json({ success: true, data });
  } catch (error) { next(error); }
});

lightingAdminRouter.put("/lighting-rules/:roomType", async (request, response, next) => {
  try {
    const { roomType } = z.object({ roomType: roomTypeSchema }).parse(request.params);
    const input = lightingRuleSchema.parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.lightingRule.findUnique({ where: { roomType } });
      const updated = await tx.lightingRule.upsert({
        where: { roomType },
        create: { roomType, lumenPerM2: input.lumenPerM2, notes: input.notes ?? null },
        update: { lumenPerM2: input.lumenPerM2, notes: input.notes ?? null },
      });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: before ? "LIGHTING_RULE_UPDATED" : "LIGHTING_RULE_CREATED", entity: "LightingRule", entityId: roomType, before, after: updated });
      return updated;
    });
    response.json({ success: true, data: result });
  } catch (error) { next(error); }
});

lightingAdminRouter.delete("/lighting-rules/:roomType", async (request, response, next) => {
  try {
    const { roomType } = z.object({ roomType: roomTypeSchema }).parse(request.params);
    await prisma.$transaction(async (tx) => {
      const before = await tx.lightingRule.findUnique({ where: { roomType } });
      if (!before) throw new HttpError(404, "Lighting rule not found", "LIGHTING_RULE_NOT_FOUND");
      await tx.lightingRule.delete({ where: { roomType } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "LIGHTING_RULE_DELETED", entity: "LightingRule", entityId: roomType, before });
    });
    response.json({ success: true, data: { roomType, deleted: true } });
  } catch (error) { next(error); }
});
