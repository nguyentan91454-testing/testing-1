import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { recordAdminChange } from "./admin-audit.js";

const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
const slugSchema = z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const productSelect = { id: true, slug: true, name: true, description: true, status: true, isActive: true, minPriceVnd: true, warrantyMonths: true, brandId: true, createdAt: true, updatedAt: true } satisfies Prisma.ProductSelect;

export const adminCatalogRouter = Router();

adminCatalogRouter.get("/attribute-definitions", async (_request, response, next) => {
  try {
    const data = await prisma.attributeDefinition.findMany({ orderBy: { key: "asc" } });
    response.json({ success: true, data });
  } catch (error) { next(error); }
});

adminCatalogRouter.post("/attribute-definitions", async (request, response, next) => {
  try {
    const input = z.object({
      key: z.string().trim().min(2).max(80).regex(/^[a-z][a-z0-9_]*$/),
      label: z.string().trim().min(1).max(120),
      type: z.enum(["STRING", "NUMBER", "BOOLEAN", "JSON"]),
      unit: z.string().trim().max(30).nullable().optional(),
      allowedValues: z.json().nullable().optional(),
    }).parse(request.body);
    const attribute = await prisma.$transaction(async (tx) => {
      const created = await tx.attributeDefinition.create({ data: {
        key: input.key, label: input.label, type: input.type,
        unit: input.unit ?? null, allowedValues: input.allowedValues as Prisma.InputJsonValue | null ?? Prisma.JsonNull,
      } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "ATTRIBUTE_DEFINITION_CREATED", entity: "AttributeDefinition", entityId: created.id, after: { key: created.key, label: created.label } });
      return created;
    });
    response.status(201).json({ success: true, data: attribute });
  } catch (error) { next(error); }
});

adminCatalogRouter.put("/products/:productId/attributes", async (request, response, next) => {
  try {
    const { productId } = z.object({ productId: z.string().uuid() }).parse(request.params);
    const input = z.object({ attributes: z.array(z.object({ key: z.string().trim().min(1).max(80), value: z.json() })).max(100) }).parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      if (!await tx.product.findUnique({ where: { id: productId }, select: { id: true } })) throw new HttpError(404, "Product not found", "PRODUCT_NOT_FOUND");
      const definitions = await tx.attributeDefinition.findMany({ where: { key: { in: input.attributes.map(({ key }) => key) } }, select: { id: true, key: true } });
      if (definitions.length !== new Set(input.attributes.map(({ key }) => key)).size) throw new HttpError(400, "Every attribute key must exist and be unique", "INVALID_PRODUCT_ATTRIBUTES");
      await tx.productAttribute.deleteMany({ where: { productId } });
      if (input.attributes.length) await tx.productAttribute.createMany({ data: input.attributes.map(({ key, value }) => ({ productId, attributeId: definitions.find((definition) => definition.key === key)!.id, value: value as Prisma.InputJsonValue })) });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "PRODUCT_ATTRIBUTES_REPLACED", entity: "Product", entityId: productId, after: input.attributes });
      return tx.productAttribute.findMany({ where: { productId }, include: { attribute: true } });
    });
    response.json({ success: true, data: result });
  } catch (error) { next(error); }
});

adminCatalogRouter.put("/variants/:variantId/attributes", async (request, response, next) => {
  try {
    const { variantId } = z.object({ variantId: z.string().uuid() }).parse(request.params);
    const input = z.object({ attributes: z.array(z.object({ key: z.string().trim().min(1).max(80), value: z.json() })).max(100) }).parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      if (!await tx.variant.findUnique({ where: { id: variantId }, select: { id: true } })) throw new HttpError(404, "Variant not found", "VARIANT_NOT_FOUND");
      const definitions = await tx.attributeDefinition.findMany({ where: { key: { in: input.attributes.map(({ key }) => key) } }, select: { id: true, key: true } });
      if (definitions.length !== new Set(input.attributes.map(({ key }) => key)).size) throw new HttpError(400, "Every attribute key must exist and be unique", "INVALID_VARIANT_ATTRIBUTES");
      await tx.variantAttribute.deleteMany({ where: { variantId } });
      if (input.attributes.length) await tx.variantAttribute.createMany({ data: input.attributes.map(({ key, value }) => ({ variantId, attributeId: definitions.find((definition) => definition.key === key)!.id, value: value as Prisma.InputJsonValue })) });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "VARIANT_ATTRIBUTES_REPLACED", entity: "Variant", entityId: variantId, after: input.attributes });
      return tx.variantAttribute.findMany({ where: { variantId }, include: { attribute: true } });
    });
    response.json({ success: true, data: result });
  } catch (error) { next(error); }
});

adminCatalogRouter.get("/products", async (request, response, next) => {
  try {
    const query = pageSchema.extend({ q: z.string().trim().max(120).optional(), status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional() }).parse(request.query);
    const where: Prisma.ProductWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { slug: { contains: query.q, mode: "insensitive" } }] } : {}),
    };
    const [data, total] = await prisma.$transaction([
      prisma.product.findMany({ where, select: { ...productSelect, categories: { include: { category: true } }, images: { orderBy: { sortOrder: "asc" } }, variants: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }),
      prisma.product.count({ where }),
    ]);
    response.json({ success: true, data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
  } catch (error) { next(error); }
});

adminCatalogRouter.get("/products/:productId", async (request, response, next) => {
  try {
    const { productId } = z.object({ productId: z.string().uuid() }).parse(request.params);
    const product = await prisma.product.findUnique({ where: { id: productId }, include: { brand: true, categories: { include: { category: true } }, images: { orderBy: { sortOrder: "asc" } }, variants: { include: { options: { include: { value: { include: { optionType: true } } } } } }, spaces: { include: { space: true } }, styles: { include: { style: true } }, attributes: { include: { attribute: true } } } });
    if (!product) throw new HttpError(404, "Product not found", "PRODUCT_NOT_FOUND");
    response.json({ success: true, data: product });
  } catch (error) { next(error); }
});

adminCatalogRouter.post("/products", async (request, response, next) => {
  try {
    const input = z.object({
      slug: slugSchema,
      name: z.string().trim().min(2).max(200),
      description: z.string().trim().min(1).max(20_000),
      status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
      warrantyMonths: z.number().int().min(0).max(120).default(12),
      brandId: z.string().uuid().nullable().optional(),
      categoryIds: z.array(z.string().uuid()).max(50).default([]),
    }).parse(request.body);
    if (input.status === "ACTIVE") throw new HttpError(400, "Create the product as a draft, add an available variant, then activate it", "PRODUCT_REQUIRES_VARIANT");
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: {
        slug: input.slug,
        name: input.name,
        description: input.description,
        status: input.status,
        isActive: input.status === "ACTIVE",
        warrantyMonths: input.warrantyMonths,
        brandId: input.brandId ?? null,
      } });
      if (input.categoryIds.length) await tx.productCategory.createMany({ data: [...new Set(input.categoryIds)].map((categoryId) => ({ productId: created.id, categoryId })) });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "PRODUCT_CREATED", entity: "Product", entityId: created.id, after: { slug: created.slug, name: created.name, status: created.status } });
      return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: { categories: { include: { category: true } }, variants: true, images: true } });
    });
    response.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
});

adminCatalogRouter.patch("/products/:productId", async (request, response, next) => {
  try {
    const { productId } = z.object({ productId: z.string().uuid() }).parse(request.params);
    const input = z.object({
      slug: slugSchema.optional(),
      name: z.string().trim().min(2).max(200).optional(),
      description: z.string().trim().min(1).max(20_000).optional(),
      status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
      warrantyMonths: z.number().int().min(0).max(120).optional(),
      brandId: z.string().uuid().nullable().optional(),
      categoryIds: z.array(z.string().uuid()).max(50).optional(),
    }).refine((value) => Object.keys(value).length > 0, "At least one field is required").parse(request.body);
    const product = await prisma.$transaction(async (tx) => {
      const before = await tx.product.findUnique({ where: { id: productId }, select: productSelect });
      if (!before) throw new HttpError(404, "Product not found", "PRODUCT_NOT_FOUND");
      if (input.status === "ACTIVE" && await tx.variant.count({ where: { productId, isAvailable: true } }) === 0) {
        throw new HttpError(400, "An active product needs at least one available variant", "PRODUCT_REQUIRES_VARIANT");
      }
      const updated = await tx.product.update({ where: { id: productId }, data: {
        ...(input.slug === undefined ? {} : { slug: input.slug }),
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.status === undefined ? {} : { status: input.status, isActive: input.status === "ACTIVE" }),
        ...(input.warrantyMonths === undefined ? {} : { warrantyMonths: input.warrantyMonths }),
        ...(input.brandId === undefined ? {} : { brandId: input.brandId }),
      } });
      if (input.categoryIds !== undefined) {
        await tx.productCategory.deleteMany({ where: { productId } });
        const categoryIds = [...new Set(input.categoryIds)];
        if (categoryIds.length) await tx.productCategory.createMany({ data: categoryIds.map((categoryId) => ({ productId, categoryId })) });
      }
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "PRODUCT_UPDATED", entity: "Product", entityId: productId, before: { slug: before.slug, name: before.name, status: before.status }, after: { slug: updated.slug, name: updated.name, status: updated.status } });
      return tx.product.findUniqueOrThrow({ where: { id: productId }, include: { categories: { include: { category: true } }, variants: true, images: true } });
    });
    response.json({ success: true, data: product });
  } catch (error) { next(error); }
});

adminCatalogRouter.delete("/products/:productId", async (request, response, next) => {
  try {
    const { productId } = z.object({ productId: z.string().uuid() }).parse(request.params);
    const product = await prisma.$transaction(async (tx) => {
      const before = await tx.product.findUnique({ where: { id: productId }, select: productSelect });
      if (!before) throw new HttpError(404, "Product not found", "PRODUCT_NOT_FOUND");
      const archived = await tx.product.update({ where: { id: productId }, data: { status: "ARCHIVED", isActive: false } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "PRODUCT_ARCHIVED", entity: "Product", entityId: productId, before: { status: before.status }, after: { status: archived.status } });
      return archived;
    });
    response.json({ success: true, data: product });
  } catch (error) { next(error); }
});

adminCatalogRouter.get("/variants", async (request, response, next) => {
  try {
    const query = pageSchema.extend({ productId: z.string().uuid().optional(), q: z.string().trim().max(100).optional(), isAvailable: z.enum(["true", "false"]).optional() }).parse(request.query);
    const where: Prisma.VariantWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.isAvailable === undefined ? {} : { isAvailable: query.isAvailable === "true" }),
      ...(query.q ? { OR: [{ sku: { contains: query.q, mode: "insensitive" } }, { product: { name: { contains: query.q, mode: "insensitive" } } }] } : {}),
    };
    const [data, total] = await prisma.$transaction([
      prisma.variant.findMany({ where, include: { options: { include: { value: { include: { optionType: true } } } }, product: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }),
      prisma.variant.count({ where }),
    ]);
    response.json({ success: true, data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
  } catch (error) { next(error); }
});

const variantFields = {
  sku: z.string().trim().min(1).max(100),
  priceVnd: z.number().int().nonnegative(),
  compareAtPriceVnd: z.number().int().nonnegative().nullable(),
  stockQty: z.number().int().nonnegative(),
  weightG: z.number().int().positive().nullable(),
  packLengthMm: z.number().int().positive().nullable(),
  packWidthMm: z.number().int().positive().nullable(),
  packHeightMm: z.number().int().positive().nullable(),
  isFragile: z.boolean(),
  declaredValueVnd: z.number().int().nonnegative().nullable(),
  warehouseId: z.string().trim().min(1).max(80),
  isAvailable: z.boolean(),
  optionValueIds: z.array(z.string().uuid()).max(20),
};

async function replaceVariantOptions(tx: Prisma.TransactionClient, variantId: string, optionValueIds: string[]) {
  const uniqueIds = [...new Set(optionValueIds)];
  const values = uniqueIds.length ? await tx.optionValue.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, optionTypeId: true } }) : [];
  if (values.length !== uniqueIds.length || new Set(values.map((value) => value.optionTypeId)).size !== values.length) {
    throw new HttpError(400, "Variant options must exist and include at most one value per option type", "INVALID_VARIANT_OPTIONS");
  }
  await tx.variantOption.deleteMany({ where: { variantId } });
  if (uniqueIds.length) await tx.variantOption.createMany({ data: uniqueIds.map((valueId) => ({ variantId, valueId })) });
}

async function refreshProductMinPrice(tx: Prisma.TransactionClient, productId: string) {
  const minimum = await tx.variant.aggregate({ where: { productId, isAvailable: true }, _min: { priceVnd: true } });
  await tx.product.update({ where: { id: productId }, data: {
    minPriceVnd: minimum._min.priceVnd ?? 0,
    ...(minimum._min.priceVnd === null ? { status: "DRAFT", isActive: false } : {}),
  } });
}

adminCatalogRouter.post("/products/:productId/variants", async (request, response, next) => {
  try {
    const { productId } = z.object({ productId: z.string().uuid() }).parse(request.params);
    const input = z.object(variantFields).extend({ compareAtPriceVnd: variantFields.compareAtPriceVnd.default(null), weightG: variantFields.weightG.default(null), packLengthMm: variantFields.packLengthMm.default(null), packWidthMm: variantFields.packWidthMm.default(null), packHeightMm: variantFields.packHeightMm.default(null), isFragile: variantFields.isFragile.default(false), declaredValueVnd: variantFields.declaredValueVnd.default(null), warehouseId: variantFields.warehouseId.default("default"), isAvailable: variantFields.isAvailable.default(true), optionValueIds: variantFields.optionValueIds.default([]) }).parse(request.body);
    if (input.compareAtPriceVnd !== null && input.compareAtPriceVnd < input.priceVnd) throw new HttpError(400, "compareAtPriceVnd must be at least priceVnd", "INVALID_COMPARE_PRICE");
    const variant = await prisma.$transaction(async (tx) => {
      const created = await tx.variant.create({ data: {
        productId,
        sku: input.sku,
        priceVnd: input.priceVnd,
        compareAtPriceVnd: input.compareAtPriceVnd,
        stockQty: input.stockQty,
        weightG: input.weightG,
        packLengthMm: input.packLengthMm,
        packWidthMm: input.packWidthMm,
        packHeightMm: input.packHeightMm,
        isFragile: input.isFragile,
        declaredValueVnd: input.declaredValueVnd,
        warehouseId: input.warehouseId,
        isAvailable: input.isAvailable,
      } });
      await replaceVariantOptions(tx, created.id, input.optionValueIds);
      await refreshProductMinPrice(tx, productId);
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "VARIANT_CREATED", entity: "Variant", entityId: created.id, after: { sku: created.sku, productId, priceVnd: created.priceVnd, stockQty: created.stockQty } });
      return tx.variant.findUniqueOrThrow({ where: { id: created.id }, include: { options: { include: { value: true } } } });
    });
    response.status(201).json({ success: true, data: variant });
  } catch (error) { next(error); }
});

adminCatalogRouter.patch("/variants/:variantId", async (request, response, next) => {
  try {
    const { variantId } = z.object({ variantId: z.string().uuid() }).parse(request.params);
    const schema = z.object({
      sku: variantFields.sku.optional(),
      priceVnd: variantFields.priceVnd.optional(),
      compareAtPriceVnd: variantFields.compareAtPriceVnd.optional(),
      stockQty: variantFields.stockQty.optional(),
      weightG: variantFields.weightG.optional(),
      packLengthMm: variantFields.packLengthMm.optional(),
      packWidthMm: variantFields.packWidthMm.optional(),
      packHeightMm: variantFields.packHeightMm.optional(),
      isFragile: variantFields.isFragile.optional(),
      declaredValueVnd: variantFields.declaredValueVnd.optional(),
      warehouseId: variantFields.warehouseId.optional(),
      isAvailable: variantFields.isAvailable.optional(),
      optionValueIds: variantFields.optionValueIds.optional(),
    }).refine((value) => Object.keys(value).length > 0, "At least one field is required");
    const input = schema.parse(request.body);
    const variant = await prisma.$transaction(async (tx) => {
      const before = await tx.variant.findUnique({ where: { id: variantId } });
      if (!before) throw new HttpError(404, "Variant not found", "VARIANT_NOT_FOUND");
      const nextPrice = input.priceVnd ?? before.priceVnd;
      const nextCompare = input.compareAtPriceVnd === undefined ? before.compareAtPriceVnd : input.compareAtPriceVnd;
      if (nextCompare !== null && nextCompare < nextPrice) throw new HttpError(400, "compareAtPriceVnd must be at least priceVnd", "INVALID_COMPARE_PRICE");
      const { optionValueIds, ...data } = input;
      const updateData: Prisma.VariantUpdateInput = {
        ...(data.sku === undefined ? {} : { sku: data.sku }),
        ...(data.priceVnd === undefined ? {} : { priceVnd: data.priceVnd }),
        ...(data.compareAtPriceVnd === undefined ? {} : { compareAtPriceVnd: data.compareAtPriceVnd }),
        ...(data.stockQty === undefined ? {} : { stockQty: data.stockQty }),
        ...(data.weightG === undefined ? {} : { weightG: data.weightG }),
        ...(data.packLengthMm === undefined ? {} : { packLengthMm: data.packLengthMm }),
        ...(data.packWidthMm === undefined ? {} : { packWidthMm: data.packWidthMm }),
        ...(data.packHeightMm === undefined ? {} : { packHeightMm: data.packHeightMm }),
        ...(data.isFragile === undefined ? {} : { isFragile: data.isFragile }),
        ...(data.declaredValueVnd === undefined ? {} : { declaredValueVnd: data.declaredValueVnd }),
        ...(data.warehouseId === undefined ? {} : { warehouseId: data.warehouseId }),
        ...(data.isAvailable === undefined ? {} : { isAvailable: data.isAvailable }),
      };
      const updated = await tx.variant.update({ where: { id: variantId }, data: updateData });
      if (optionValueIds !== undefined) await replaceVariantOptions(tx, variantId, optionValueIds);
      if (input.priceVnd !== undefined || input.isAvailable !== undefined) await refreshProductMinPrice(tx, before.productId);
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "VARIANT_UPDATED", entity: "Variant", entityId: variantId, before: { sku: before.sku, priceVnd: before.priceVnd, stockQty: before.stockQty, isAvailable: before.isAvailable }, after: { sku: updated.sku, priceVnd: updated.priceVnd, stockQty: updated.stockQty, isAvailable: updated.isAvailable } });
      return tx.variant.findUniqueOrThrow({ where: { id: variantId }, include: { options: { include: { value: true } } } });
    });
    response.json({ success: true, data: variant });
  } catch (error) { next(error); }
});

adminCatalogRouter.delete("/variants/:variantId", async (request, response, next) => {
  try {
    const { variantId } = z.object({ variantId: z.string().uuid() }).parse(request.params);
    const variant = await prisma.$transaction(async (tx) => {
      const before = await tx.variant.findUnique({ where: { id: variantId } });
      if (!before) throw new HttpError(404, "Variant not found", "VARIANT_NOT_FOUND");
      const updated = await tx.variant.update({ where: { id: variantId }, data: { isAvailable: false } });
      await refreshProductMinPrice(tx, before.productId);
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "VARIANT_DISABLED", entity: "Variant", entityId: variantId, before: { isAvailable: before.isAvailable }, after: { isAvailable: updated.isAvailable } });
      return updated;
    });
    response.json({ success: true, data: variant });
  } catch (error) { next(error); }
});

adminCatalogRouter.get("/option-types", async (_request, response, next) => {
  try {
    const data = await prisma.optionType.findMany({ include: { values: { orderBy: { label: "asc" } } }, orderBy: { name: "asc" } });
    response.json({ success: true, data });
  } catch (error) { next(error); }
});

adminCatalogRouter.post("/option-types", async (request, response, next) => {
  try {
    const input = z.object({ key: z.string().trim().min(1).max(80).regex(/^[a-z0-9_-]+$/), name: z.string().trim().min(1).max(100) }).parse(request.body);
    const optionType = await prisma.$transaction(async (tx) => {
      const created = await tx.optionType.create({ data: input });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "OPTION_TYPE_CREATED", entity: "OptionType", entityId: created.id, after: input });
      return created;
    });
    response.status(201).json({ success: true, data: optionType });
  } catch (error) { next(error); }
});

adminCatalogRouter.patch("/option-types/:optionTypeId", async (request, response, next) => {
  try {
    const { optionTypeId } = z.object({ optionTypeId: z.string().uuid() }).parse(request.params);
    const input = z.object({ key: z.string().trim().min(1).max(80).regex(/^[a-z0-9_-]+$/).optional(), name: z.string().trim().min(1).max(100).optional() }).refine((value) => Object.keys(value).length > 0).parse(request.body);
    const optionType = await prisma.$transaction(async (tx) => {
      const before = await tx.optionType.findUnique({ where: { id: optionTypeId } });
      if (!before) throw new HttpError(404, "Option type not found", "OPTION_TYPE_NOT_FOUND");
      const updated = await tx.optionType.update({ where: { id: optionTypeId }, data: { ...(input.key === undefined ? {} : { key: input.key }), ...(input.name === undefined ? {} : { name: input.name }) } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "OPTION_TYPE_UPDATED", entity: "OptionType", entityId: optionTypeId, before: { key: before.key, name: before.name }, after: { key: updated.key, name: updated.name } });
      return updated;
    });
    response.json({ success: true, data: optionType });
  } catch (error) { next(error); }
});

adminCatalogRouter.delete("/option-types/:optionTypeId", async (request, response, next) => {
  try {
    const { optionTypeId } = z.object({ optionTypeId: z.string().uuid() }).parse(request.params);
    await prisma.$transaction(async (tx) => {
      const before = await tx.optionType.findUnique({ where: { id: optionTypeId } });
      if (!before) throw new HttpError(404, "Option type not found", "OPTION_TYPE_NOT_FOUND");
      await tx.optionType.delete({ where: { id: optionTypeId } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "OPTION_TYPE_DELETED", entity: "OptionType", entityId: optionTypeId, before: { key: before.key, name: before.name } });
    });
    response.json({ success: true, data: { id: optionTypeId, deleted: true } });
  } catch (error) { next(error); }
});

adminCatalogRouter.post("/option-types/:optionTypeId/values", async (request, response, next) => {
  try {
    const { optionTypeId } = z.object({ optionTypeId: z.string().uuid() }).parse(request.params);
    const input = z.object({ value: z.string().trim().min(1).max(100), label: z.string().trim().min(1).max(120) }).parse(request.body);
    const optionValue = await prisma.$transaction(async (tx) => {
      const created = await tx.optionValue.create({ data: { ...input, optionTypeId } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "OPTION_VALUE_CREATED", entity: "OptionValue", entityId: created.id, after: { optionTypeId, value: created.value, label: created.label } });
      return created;
    });
    response.status(201).json({ success: true, data: optionValue });
  } catch (error) { next(error); }
});

adminCatalogRouter.patch("/option-values/:valueId", async (request, response, next) => {
  try {
    const { valueId } = z.object({ valueId: z.string().uuid() }).parse(request.params);
    const input = z.object({ value: z.string().trim().min(1).max(100).optional(), label: z.string().trim().min(1).max(120).optional() }).refine((value) => Object.keys(value).length > 0).parse(request.body);
    const optionValue = await prisma.$transaction(async (tx) => {
      const before = await tx.optionValue.findUnique({ where: { id: valueId } });
      if (!before) throw new HttpError(404, "Option value not found", "OPTION_VALUE_NOT_FOUND");
      const updated = await tx.optionValue.update({ where: { id: valueId }, data: { ...(input.value === undefined ? {} : { value: input.value }), ...(input.label === undefined ? {} : { label: input.label }) } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "OPTION_VALUE_UPDATED", entity: "OptionValue", entityId: valueId, before: { value: before.value, label: before.label }, after: { value: updated.value, label: updated.label } });
      return updated;
    });
    response.json({ success: true, data: optionValue });
  } catch (error) { next(error); }
});

adminCatalogRouter.delete("/option-values/:valueId", async (request, response, next) => {
  try {
    const { valueId } = z.object({ valueId: z.string().uuid() }).parse(request.params);
    await prisma.$transaction(async (tx) => {
      const before = await tx.optionValue.findUnique({ where: { id: valueId } });
      if (!before) throw new HttpError(404, "Option value not found", "OPTION_VALUE_NOT_FOUND");
      await tx.optionValue.delete({ where: { id: valueId } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "OPTION_VALUE_DELETED", entity: "OptionValue", entityId: valueId, before: { value: before.value, label: before.label } });
    });
    response.json({ success: true, data: { id: valueId, deleted: true } });
  } catch (error) { next(error); }
});

const imageFields = {
  url: z.string().url().refine((value) => /^https?:\/\//i.test(value)),
  alt: z.string().trim().min(1).max(300),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  kind: z.string().trim().min(1).max(50).default("product"),
  sortOrder: z.number().int().min(0).default(0),
  sourceUrl: z.string().url().nullable().optional(),
  author: z.string().trim().max(160).nullable().optional(),
  license: z.string().trim().max(160).nullable().optional(),
};

adminCatalogRouter.post("/products/:productId/images", async (request, response, next) => {
  try {
    const { productId } = z.object({ productId: z.string().uuid() }).parse(request.params);
    const input = z.object(imageFields).extend({ variantId: z.string().uuid().nullable().optional() }).parse(request.body);
    const image = await prisma.$transaction(async (tx) => {
      if (input.variantId && !await tx.variant.findFirst({ where: { id: input.variantId, productId }, select: { id: true } })) throw new HttpError(400, "Image variant must belong to the product", "INVALID_IMAGE_VARIANT");
      const { variantId, ...imageData } = input;
      const created = await tx.productImage.create({ data: {
        ...imageData,
        productId,
        variantId: variantId ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        sourceUrl: input.sourceUrl ?? null,
        author: input.author ?? null,
        license: input.license ?? null,
      } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "PRODUCT_IMAGE_CREATED", entity: "ProductImage", entityId: created.id, after: { productId, url: created.url, sortOrder: created.sortOrder } });
      return created;
    });
    response.status(201).json({ success: true, data: image });
  } catch (error) { next(error); }
});

adminCatalogRouter.patch("/images/:imageId", async (request, response, next) => {
  try {
    const { imageId } = z.object({ imageId: z.string().uuid() }).parse(request.params);
    const schema = z.object({
      url: imageFields.url.optional(), alt: imageFields.alt.optional(), width: imageFields.width, height: imageFields.height,
      kind: imageFields.kind.optional(), sortOrder: imageFields.sortOrder.optional(), sourceUrl: imageFields.sourceUrl,
      author: imageFields.author, license: imageFields.license,
    }).refine((value) => Object.keys(value).length > 0, "At least one field is required");
    const input = schema.parse(request.body);
    const image = await prisma.$transaction(async (tx) => {
      const before = await tx.productImage.findUnique({ where: { id: imageId } });
      if (!before) throw new HttpError(404, "Image not found", "IMAGE_NOT_FOUND");
      const updateData: Prisma.ProductImageUpdateInput = {
        ...(input.url === undefined ? {} : { url: input.url }),
        ...(input.alt === undefined ? {} : { alt: input.alt }),
        ...(input.width === undefined ? {} : { width: input.width }),
        ...(input.height === undefined ? {} : { height: input.height }),
        ...(input.kind === undefined ? {} : { kind: input.kind }),
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
        ...(input.sourceUrl === undefined ? {} : { sourceUrl: input.sourceUrl }),
        ...(input.author === undefined ? {} : { author: input.author }),
        ...(input.license === undefined ? {} : { license: input.license }),
      };
      const updated = await tx.productImage.update({ where: { id: imageId }, data: updateData });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "PRODUCT_IMAGE_UPDATED", entity: "ProductImage", entityId: imageId, before: { url: before.url, sortOrder: before.sortOrder }, after: { url: updated.url, sortOrder: updated.sortOrder } });
      return updated;
    });
    response.json({ success: true, data: image });
  } catch (error) { next(error); }
});

adminCatalogRouter.delete("/images/:imageId", async (request, response, next) => {
  try {
    const { imageId } = z.object({ imageId: z.string().uuid() }).parse(request.params);
    await prisma.$transaction(async (tx) => {
      const before = await tx.productImage.findUnique({ where: { id: imageId }, select: { id: true, url: true } });
      if (!before) throw new HttpError(404, "Image not found", "IMAGE_NOT_FOUND");
      await tx.productImage.delete({ where: { id: imageId } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "PRODUCT_IMAGE_DELETED", entity: "ProductImage", entityId: imageId, before });
    });
    response.json({ success: true, data: { id: imageId, deleted: true } });
  } catch (error) { next(error); }
});

adminCatalogRouter.use((error: unknown, _request: unknown, _response: unknown, next: (error?: unknown) => void) => {
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
