import { Router } from "express";
import { z } from "zod";
import { requireCustomer } from "../../http/customer-auth.js";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";

const maxAddresses = 10;
const idSchema = z.string().uuid();
const addressSchema = z.object({
  label: z.string().trim().max(40).optional().nullable(),
  recipientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(9).max(24).regex(/^\+?[0-9][0-9 ().-]*$/),
  province: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  ward: z.string().trim().min(2).max(100),
  addressDetail: z.string().trim().min(5).max(500),
  isDefault: z.boolean().optional(),
});
const addressUpdateSchema = addressSchema.partial().refine((value) => Object.keys(value).length > 0, "Không có thông tin cần cập nhật.");

export const customerAddressRouter = Router();
customerAddressRouter.use(requireCustomer);

const addressSelect = {
  id: true,
  label: true,
  recipientName: true,
  phone: true,
  province: true,
  district: true,
  ward: true,
  addressDetail: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function ensureLegacyAddress(userId: string) {
  const existing = await prisma.customerAddress.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: addressSelect });
  if (existing.length > 0) return existing;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true, province: true, ward: true, addressDetail: true } });
  if (!user?.phone || !user.province || !user.ward || !user.addressDetail) return existing;
  const migrated = await prisma.customerAddress.create({
    data: { userId, label: "Nhà riêng", recipientName: user.name, phone: user.phone, province: user.province, district: "", ward: user.ward, addressDetail: user.addressDetail, isDefault: true },
    select: addressSelect,
  });
  return [migrated];
}

async function readAddresses(userId: string) {
  return ensureLegacyAddress(userId);
}

customerAddressRouter.get("/", async (request, response, next) => {
  try {
    response.json({ success: true, data: await readAddresses(request.customer!.id) });
  } catch (error) { next(error); }
});

customerAddressRouter.post("/", async (request, response, next) => {
  try {
    const input = addressSchema.parse(request.body);
    const created = await prisma.$transaction(async (tx) => {
      const count = await tx.customerAddress.count({ where: { userId: request.customer!.id } });
      if (count >= maxAddresses) throw new HttpError(400, "Bạn chỉ có thể lưu tối đa 10 địa chỉ.", "ADDRESS_LIMIT_REACHED");
      const isDefault = count === 0 || input.isDefault === true;
      if (isDefault) await tx.customerAddress.updateMany({ where: { userId: request.customer!.id }, data: { isDefault: false } });
      const label = input.label;
      const fields = { recipientName: input.recipientName, phone: input.phone, province: input.province, district: input.district, ward: input.ward, addressDetail: input.addressDetail };
      return tx.customerAddress.create({ data: { ...fields, label: label ?? null, userId: request.customer!.id, isDefault }, select: addressSelect });
    });
    response.status(201).json({ success: true, data: created });
  } catch (error) { next(error); }
});

customerAddressRouter.patch("/:addressId", async (request, response, next) => {
  try {
    const addressId = idSchema.parse(request.params.addressId);
    const input = addressUpdateSchema.parse(request.body);
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.customerAddress.findFirst({ where: { id: addressId, userId: request.customer!.id } });
      if (!current) throw new HttpError(404, "Không tìm thấy địa chỉ.", "ADDRESS_NOT_FOUND");
      const nextIsDefault = input.isDefault;
      if (nextIsDefault === true) await tx.customerAddress.updateMany({ where: { userId: request.customer!.id, id: { not: addressId } }, data: { isDefault: false } });
      if (nextIsDefault === false && current.isDefault) {
        const replacement = await tx.customerAddress.findFirst({ where: { userId: request.customer!.id, id: { not: addressId } }, orderBy: { updatedAt: "desc" } });
        if (replacement) await tx.customerAddress.update({ where: { id: replacement.id }, data: { isDefault: true } });
        else input.isDefault = true;
      }
      const data = {
        ...(input.label === undefined ? {} : { label: input.label === "" ? null : input.label }),
        ...(input.recipientName === undefined ? {} : { recipientName: input.recipientName }),
        ...(input.phone === undefined ? {} : { phone: input.phone }),
        ...(input.province === undefined ? {} : { province: input.province }),
        ...(input.district === undefined ? {} : { district: input.district }),
        ...(input.ward === undefined ? {} : { ward: input.ward }),
        ...(input.addressDetail === undefined ? {} : { addressDetail: input.addressDetail }),
        ...(input.isDefault === undefined ? {} : { isDefault: input.isDefault }),
      };
      return tx.customerAddress.update({ where: { id: addressId }, data, select: addressSelect });
    });
    response.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

customerAddressRouter.post("/:addressId/default", async (request, response, next) => {
  try {
    const addressId = idSchema.parse(request.params.addressId);
    const updated = await prisma.$transaction(async (tx) => {
      const address = await tx.customerAddress.findFirst({ where: { id: addressId, userId: request.customer!.id } });
      if (!address) throw new HttpError(404, "Không tìm thấy địa chỉ.", "ADDRESS_NOT_FOUND");
      await tx.customerAddress.updateMany({ where: { userId: request.customer!.id }, data: { isDefault: false } });
      return tx.customerAddress.update({ where: { id: addressId }, data: { isDefault: true }, select: addressSelect });
    });
    response.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

customerAddressRouter.delete("/:addressId", async (request, response, next) => {
  try {
    const addressId = idSchema.parse(request.params.addressId);
    const result = await prisma.$transaction(async (tx) => {
      const address = await tx.customerAddress.findFirst({ where: { id: addressId, userId: request.customer!.id } });
      if (!address) throw new HttpError(404, "Không tìm thấy địa chỉ.", "ADDRESS_NOT_FOUND");
      await tx.customerAddress.delete({ where: { id: addressId } });
      if (address.isDefault) {
        const replacement = await tx.customerAddress.findFirst({ where: { userId: request.customer!.id }, orderBy: { updatedAt: "desc" } });
        if (replacement) await tx.customerAddress.update({ where: { id: replacement.id }, data: { isDefault: true } });
      }
      return readAddressesWithClient(tx, request.customer!.id);
    });
    response.json({ success: true, data: result });
  } catch (error) { next(error); }
});

function readAddressesWithClient(client: Pick<typeof prisma, "customerAddress">, userId: string) {
  return client.customerAddress.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: addressSelect });
}
