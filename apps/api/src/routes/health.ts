import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

healthRouter.get("/live", (_request, response) => {
  response.json({ success: true, data: { status: "ok" } });
});

healthRouter.get("/ready", async (_request, response, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ success: true, data: { status: "ready" } });
  } catch (error) {
    next(error);
  }
});

