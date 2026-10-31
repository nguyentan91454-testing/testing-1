import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { calculateLighting, LightingRuleNotFoundError } from "./lighting.service.js";

export const lightingRouter = Router();

lightingRouter.get("/room-types", async (_request, response, next) => {
  try {
    const data = await prisma.lightingRule.findMany({ orderBy: { roomType: "asc" }, select: { roomType: true, lumenPerM2: true, notes: true } });
    response.json({ success: true, data });
  } catch (error) { next(error); }
});

lightingRouter.post("/calculate", async (request, response, next) => {
  try {
    const input = z.object({
      areaM2: z.number().positive().max(500),
      roomType: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      ceilingHeightM: z.number().min(2).max(8),
      clearanceHeightM: z.number().min(1.8).max(4).default(2.1),
      tolerancePercent: z.number().min(0).max(50).default(20),
    }).refine((value) => value.clearanceHeightM < value.ceilingHeightM, { message: "clearanceHeightM must be below ceilingHeightM", path: ["clearanceHeightM"] }).parse(request.body);
    response.json({ success: true, data: await calculateLighting(input) });
  } catch (error) {
    if (error instanceof LightingRuleNotFoundError) { next(new HttpError(404, error.message, "LIGHTING_RULE_NOT_FOUND")); return; }
    next(error);
  }
});
