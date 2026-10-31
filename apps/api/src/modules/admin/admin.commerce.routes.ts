import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { recordAdminChange } from "./admin-audit.js";

export const adminCommerceRouter = Router();

adminCommerceRouter.get("/brands", async (_request, response, next) => {
  try {
    const data = await prisma.brand.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } });
    response.json({ success: true, data });
  } catch (error) { next(error); }
});

adminCommerceRouter.post("/brands", async (request, response, next) => {
  try {
    const input = z.object({ slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: z.string().trim().min(1).max(120) }).parse(request.body);
    const brand = await prisma.$transaction(async (tx) => {
      const created = await tx.brand.create({ data: input });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "BRAND_CREATED", entity: "Brand", entityId: created.id, after: input });
      return created;
    });
    response.status(201).json({ success: true, data: brand });
  } catch (error) { next(error); }
});

adminCommerceRouter.patch("/brands/:brandId", async (request, response, next) => {
  try {
    const { brandId } = z.object({ brandId: z.string().uuid() }).parse(request.params);
    const input = z.object({ slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), name: z.string().trim().min(1).max(120).optional() }).refine((value) => Object.keys(value).length > 0).parse(request.body);
    const brand = await prisma.$transaction(async (tx) => {
      const before = await tx.brand.findUnique({ where: { id: brandId } });
      if (!before) throw new HttpError(404, "Brand not found", "BRAND_NOT_FOUND");
      const updated = await tx.brand.update({ where: { id: brandId }, data: { ...(input.slug === undefined ? {} : { slug: input.slug }), ...(input.name === undefined ? {} : { name: input.name }) } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "BRAND_UPDATED", entity: "Brand", entityId: brandId, before: { slug: before.slug, name: before.name }, after: { slug: updated.slug, name: updated.name } });
      return updated;
    });
    response.json({ success: true, data: brand });
  } catch (error) { next(error); }
});

adminCommerceRouter.delete("/brands/:brandId", async (request, response, next) => {
  try {
    const { brandId } = z.object({ brandId: z.string().uuid() }).parse(request.params);
    await prisma.$transaction(async (tx) => {
      const before = await tx.brand.findUnique({ where: { id: brandId } });
      if (!before) throw new HttpError(404, "Brand not found", "BRAND_NOT_FOUND");
      await tx.brand.delete({ where: { id: brandId } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "BRAND_DELETED", entity: "Brand", entityId: brandId, before: { slug: before.slug, name: before.name } });
    });
    response.json({ success: true, data: { id: brandId, deleted: true } });
  } catch (error) { next(error); }
});

adminCommerceRouter.get("/categories", async (_request, response, next) => {
  try {
    const data = await prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    response.json({ success: true, data });
  } catch (error) { next(error); }
});

adminCommerceRouter.post("/categories", async (request, response, next) => {
  try {
    const input = z.object({ slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: z.string().trim().min(1).max(120), sortOrder: z.number().int().default(0), isActive: z.boolean().default(true) }).parse(request.body);
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({ data: input });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "CATEGORY_CREATED", entity: "Category", entityId: created.id, after: { slug: created.slug, name: created.name } });
      return created;
    });
    response.status(201).json({ success: true, data: category });
  } catch (error) { next(error); }
});

adminCommerceRouter.patch("/categories/:categoryId", async (request, response, next) => {
  try {
    const { categoryId } = z.object({ categoryId: z.string().uuid() }).parse(request.params);
    const input = z.object({ slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), name: z.string().trim().min(1).max(120).optional(), sortOrder: z.number().int().optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0).parse(request.body);
    const category = await prisma.$transaction(async (tx) => {
      const before = await tx.category.findUnique({ where: { id: categoryId } });
      if (!before) throw new HttpError(404, "Category not found", "CATEGORY_NOT_FOUND");
      const updateData: Prisma.CategoryUpdateInput = {
        ...(input.slug === undefined ? {} : { slug: input.slug }),
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      };
      const updated = await tx.category.update({ where: { id: categoryId }, data: updateData });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "CATEGORY_UPDATED", entity: "Category", entityId: categoryId, before: { slug: before.slug, name: before.name, isActive: before.isActive }, after: { slug: updated.slug, name: updated.name, isActive: updated.isActive } });
      return updated;
    });
    response.json({ success: true, data: category });
  } catch (error) { next(error); }
});

adminCommerceRouter.delete("/categories/:categoryId", async (request, response, next) => {
  try {
    const { categoryId } = z.object({ categoryId: z.string().uuid() }).parse(request.params);
    const category = await prisma.$transaction(async (tx) => {
      const before = await tx.category.findUnique({ where: { id: categoryId } });
      if (!before) throw new HttpError(404, "Category not found", "CATEGORY_NOT_FOUND");
      const updated = await tx.category.update({ where: { id: categoryId }, data: { isActive: false } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "CATEGORY_DISABLED", entity: "Category", entityId: categoryId, before: { isActive: before.isActive }, after: { isActive: false } });
      return updated;
    });
    response.json({ success: true, data: category });
  } catch (error) { next(error); }
});

adminCommerceRouter.get("/coupons", async (request, response, next) => {
  try {
    const query = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), q: z.string().trim().max(64).optional() }).parse(request.query);
    const where: Prisma.CouponWhereInput = query.q ? { code: { contains: query.q.toUpperCase() } } : {};
    const [data, total] = await prisma.$transaction([
      prisma.coupon.findMany({ where, include: { _count: { select: { redemptions: true } } }, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }),
      prisma.coupon.count({ where }),
    ]);
    response.json({ success: true, data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
  } catch (error) { next(error); }
});

const couponFields = {
  code: z.string().trim().min(3).max(64).transform((value) => value.toUpperCase()).pipe(z.string().regex(/^[A-Z0-9_-]+$/)),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().nonnegative(),
  maxDiscountVnd: z.number().int().nonnegative().nullable(),
  minOrderVnd: z.number().int().nonnegative(),
  totalLimit: z.number().int().positive().nullable(),
  perUserLimit: z.number().int().positive(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean(),
  newCustomerOnly: z.boolean(),
};
const couponCreateSchema = z.object({
  ...couponFields,
  maxDiscountVnd: couponFields.maxDiscountVnd.default(null),
  minOrderVnd: couponFields.minOrderVnd.default(0),
  totalLimit: couponFields.totalLimit.default(null),
  perUserLimit: couponFields.perUserLimit.default(1),
  isActive: couponFields.isActive.default(true),
  newCustomerOnly: couponFields.newCustomerOnly.default(false),
}).refine((value) => value.startsAt < value.endsAt && (value.type !== "PERCENT" || value.value <= 100), { message: "Invalid coupon date range or percentage" });

adminCommerceRouter.post("/coupons", async (request, response, next) => {
  try {
    const input = couponCreateSchema.parse(request.body);
    const coupon = await prisma.$transaction(async (tx) => {
      const created = await tx.coupon.create({ data: input });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "COUPON_CREATED", entity: "Coupon", entityId: created.id, after: { code: created.code, type: created.type, value: created.value, isActive: created.isActive } });
      return created;
    });
    response.status(201).json({ success: true, data: coupon });
  } catch (error) { next(error); }
});

adminCommerceRouter.patch("/coupons/:couponId", async (request, response, next) => {
  try {
    const { couponId } = z.object({ couponId: z.string().uuid() }).parse(request.params);
    const input = z.object({
      code: couponFields.code.optional(), type: couponFields.type.optional(), value: couponFields.value.optional(),
      maxDiscountVnd: couponFields.maxDiscountVnd.optional(), minOrderVnd: couponFields.minOrderVnd.optional(),
      totalLimit: couponFields.totalLimit.optional(), perUserLimit: couponFields.perUserLimit.optional(),
      startsAt: couponFields.startsAt.optional(), endsAt: couponFields.endsAt.optional(), isActive: couponFields.isActive.optional(),
      newCustomerOnly: couponFields.newCustomerOnly.optional(),
    }).refine((value) => Object.keys(value).length > 0).parse(request.body);
    const coupon = await prisma.$transaction(async (tx) => {
      const before = await tx.coupon.findUnique({ where: { id: couponId } });
      if (!before) throw new HttpError(404, "Coupon not found", "COUPON_NOT_FOUND");
      const start = input.startsAt ?? before.startsAt;
      const end = input.endsAt ?? before.endsAt;
      const type = input.type ?? before.type;
      const value = input.value ?? before.value;
      if (start >= end || (type === "PERCENT" && value > 100)) throw new HttpError(400, "Invalid coupon date range or percentage", "INVALID_COUPON");
      const updateData: Prisma.CouponUpdateInput = {
        ...(input.code === undefined ? {} : { code: input.code }),
        ...(input.type === undefined ? {} : { type: input.type }),
        ...(input.value === undefined ? {} : { value: input.value }),
        ...(input.maxDiscountVnd === undefined ? {} : { maxDiscountVnd: input.maxDiscountVnd }),
        ...(input.minOrderVnd === undefined ? {} : { minOrderVnd: input.minOrderVnd }),
        ...(input.totalLimit === undefined ? {} : { totalLimit: input.totalLimit }),
        ...(input.perUserLimit === undefined ? {} : { perUserLimit: input.perUserLimit }),
        ...(input.startsAt === undefined ? {} : { startsAt: input.startsAt }),
        ...(input.endsAt === undefined ? {} : { endsAt: input.endsAt }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
        ...(input.newCustomerOnly === undefined ? {} : { newCustomerOnly: input.newCustomerOnly }),
      };
      const updated = await tx.coupon.update({ where: { id: couponId }, data: updateData });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "COUPON_UPDATED", entity: "Coupon", entityId: couponId, before: { code: before.code, isActive: before.isActive, value: before.value }, after: { code: updated.code, isActive: updated.isActive, value: updated.value } });
      return updated;
    });
    response.json({ success: true, data: coupon });
  } catch (error) { next(error); }
});

adminCommerceRouter.delete("/coupons/:couponId", async (request, response, next) => {
  try {
    const { couponId } = z.object({ couponId: z.string().uuid() }).parse(request.params);
    const coupon = await prisma.$transaction(async (tx) => {
      const before = await tx.coupon.findUnique({ where: { id: couponId } });
      if (!before) throw new HttpError(404, "Coupon not found", "COUPON_NOT_FOUND");
      const updated = await tx.coupon.update({ where: { id: couponId }, data: { isActive: false } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "COUPON_DISABLED", entity: "Coupon", entityId: couponId, before: { isActive: before.isActive }, after: { isActive: false } });
      return updated;
    });
    response.json({ success: true, data: coupon });
  } catch (error) { next(error); }
});

adminCommerceRouter.use((error: unknown, _request: unknown, _response: unknown, next: (error?: unknown) => void) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    next(new HttpError(409, "A record with this unique value already exists", "ADMIN_DUPLICATE_VALUE"));
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    next(new HttpError(400, "A referenced record does not exist or is still in use", "ADMIN_RELATION_CONFLICT"));
    return;
  }
  next(error);
});
