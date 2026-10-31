import { Router } from "express";
import { prisma } from "../../lib/prisma.js";

export const taxonomyRouter = Router();

taxonomyRouter.get("/categories", async (_request, response, next) => {
  try {
    const data = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, sortOrder: true },
    });
    response.json({ success: true, data });
  } catch (error) { next(error); }
});

taxonomyRouter.get("/spaces", async (_request, response, next) => {
  try {
    const data = await prisma.space.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, imageUrl: true, sortOrder: true },
    });
    response.json({ success: true, data });
  } catch (error) { next(error); }
});

taxonomyRouter.get("/styles", async (_request, response, next) => {
  try {
    const data = await prisma.style.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, imageUrl: true, sortOrder: true },
    });
    response.json({ success: true, data });
  } catch (error) { next(error); }
});
