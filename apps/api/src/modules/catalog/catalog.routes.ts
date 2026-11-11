import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../http/errors.js";

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  space: z.string().trim().max(80).optional(),
  style: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minLumens: z.coerce.number().int().min(0).optional(),
  maxLumens: z.coerce.number().int().min(0).optional(),
  socket: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
}).refine((query) => (query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice)
  && (query.minLumens === undefined || query.maxLumens === undefined || query.minLumens <= query.maxLumens), {
  message: "Filter ranges are invalid",
});

export const catalogRouter = Router();

catalogRouter.get("/", async (request, response, next) => {
  try {
    const query = querySchema.parse(request.query);
    const filters: Prisma.ProductWhereInput[] = [{ status: "ACTIVE", isActive: true }];
    if (query.q) {
      const matches = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM products
        WHERE status = 'ACTIVE' AND is_active = TRUE
          AND (public.immutable_unaccent(lower(name)) LIKE '%' || public.immutable_unaccent(lower(${query.q})) || '%'
            OR public.immutable_unaccent(lower(description)) LIKE '%' || public.immutable_unaccent(lower(${query.q})) || '%')
      `);
      filters.push({ id: { in: matches.map((match) => match.id) } });
    }
    if (query.category) filters.push({ categories: { some: { category: { OR: [
      { slug: query.category },
      { parent: { slug: query.category } },
    ] } } } });
    if (query.space) filters.push({ spaces: { some: { space: { slug: query.space } } } });
    if (query.style) filters.push({ styles: { some: { style: { slug: query.style } } } });
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filters.push({ variants: { some: {
        isAvailable: true,
        priceVnd: {
          ...(query.minPrice === undefined ? {} : { gte: query.minPrice }),
          ...(query.maxPrice === undefined ? {} : { lte: query.maxPrice }),
        },
      } } });
    }
    if (query.minLumens !== undefined || query.maxLumens !== undefined || query.socket) {
      const conditions: Prisma.Sql[] = [];
      if (query.minLumens !== undefined || query.maxLumens !== undefined) conditions.push(Prisma.sql`EXISTS (
        SELECT 1 FROM product_attributes pa JOIN attribute_definitions ad ON ad.id = pa.attribute_id
        WHERE pa.product_id = p.id AND ad.key IN ('lumens', 'lumen')
          AND (pa.value #>> '{}') ~ '^[0-9]+(\\.[0-9]+)?$'
          ${query.minLumens === undefined ? Prisma.empty : Prisma.sql`AND (pa.value #>> '{}')::numeric >= ${query.minLumens}`}
          ${query.maxLumens === undefined ? Prisma.empty : Prisma.sql`AND (pa.value #>> '{}')::numeric <= ${query.maxLumens}`}
      )`);
      if (query.socket) conditions.push(Prisma.sql`EXISTS (
        SELECT 1 FROM product_attributes pa JOIN attribute_definitions ad ON ad.id = pa.attribute_id
        WHERE pa.product_id = p.id AND ad.key IN ('socket', 'socket_type', 'bulb_base')
          AND lower(pa.value #>> '{}') = lower(${query.socket})
      )`);
      const matches = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT p.id FROM products p WHERE p.status = 'ACTIVE' AND p.is_active = TRUE AND ${Prisma.join(conditions, " AND ")}`);
      filters.push({ id: { in: matches.map(({ id }) => id) } });
    }

    const where: Prisma.ProductWhereInput = { AND: filters };
    const orderBy: Prisma.ProductOrderByWithRelationInput = query.sort === "newest"
      ? { createdAt: "desc" }
      : { minPriceVnd: query.sort === "price_asc" ? "asc" : "desc" };
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          categories: { include: { category: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: { where: { isAvailable: true }, select: { id: true, sku: true, priceVnd: true, compareAtPriceVnd: true, stockQty: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    response.json({
      success: true,
      data: items,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/:slug", async (request, response, next) => {
  try {
    const { slug } = z.object({ slug: z.string().min(1).max(160) }).parse(request.params);
    const product = await prisma.product.findFirst({
      where: { slug, status: "ACTIVE", isActive: true },
      include: {
        categories: { include: { category: true } },
        brand: true,
        images: { orderBy: { sortOrder: "asc" } },
        spaces: { include: { space: true } },
        styles: { include: { style: true } },
        attributes: { include: { attribute: true } },
        variants: {
          where: { isAvailable: true },
          include: { options: { include: { value: { include: { optionType: true } } } }, attributes: { include: { attribute: true } } },
          orderBy: { priceVnd: "asc" },
        },
      },
    });
    if (!product) throw new HttpError(404, "Không tìm thấy sản phẩm", "PRODUCT_NOT_FOUND");
    response.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

