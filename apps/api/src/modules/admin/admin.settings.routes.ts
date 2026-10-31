import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { recordAdminChange } from "./admin-audit.js";

export const adminSettingsRouter = Router();

adminSettingsRouter.get("/", async (_request, response, next) => {
  try {
    const data = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    response.json({ success: true, data });
  } catch (error) { next(error); }
});

adminSettingsRouter.get("/:key", async (request, response, next) => {
  try {
    const { key } = z.object({ key: z.string().trim().min(2).max(100).regex(/^[a-z][a-z0-9_.-]*$/) }).parse(request.params);
    const setting = await prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new HttpError(404, "Setting not found", "SETTING_NOT_FOUND");
    response.json({ success: true, data: setting });
  } catch (error) { next(error); }
});

adminSettingsRouter.put("/:key", async (request, response, next) => {
  try {
    const { key } = z.object({ key: z.string().trim().min(2).max(100).regex(/^[a-z][a-z0-9_.-]*$/) }).parse(request.params);
    const { value } = z.object({ value: z.record(z.string(), z.json()) }).parse(request.body);
    const setting = await prisma.$transaction(async (tx) => {
      const before = await tx.setting.findUnique({ where: { key } });
      const updated = await tx.setting.upsert({ where: { key }, create: { key, value: value as Prisma.InputJsonObject }, update: { value: value as Prisma.InputJsonObject } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: before ? "SETTING_UPDATED" : "SETTING_CREATED", entity: "Setting", entityId: key, before: before?.value, after: updated.value });
      return updated;
    });
    response.json({ success: true, data: setting });
  } catch (error) { next(error); }
});

adminSettingsRouter.delete("/:key", async (request, response, next) => {
  try {
    const { key } = z.object({ key: z.string().trim().min(2).max(100).regex(/^[a-z][a-z0-9_.-]*$/) }).parse(request.params);
    await prisma.$transaction(async (tx) => {
      const before = await tx.setting.findUnique({ where: { key } });
      if (!before) throw new HttpError(404, "Setting not found", "SETTING_NOT_FOUND");
      await tx.setting.delete({ where: { key } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "SETTING_DELETED", entity: "Setting", entityId: key, before: before.value });
    });
    response.json({ success: true, data: { key, deleted: true } });
  } catch (error) { next(error); }
});
