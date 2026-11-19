import type { Prisma } from "@prisma/client";
import { z } from "zod";

export const customerProfileSelect = {
  id: true, email: true, name: true, avatarUrl: true, emailVerifiedAt: true,
  avatarStorageKey: true,
  phone: true, province: true, ward: true, addressDetail: true,
} satisfies Prisma.UserSelect;

type CustomerRow = Prisma.UserGetPayload<{ select: typeof customerProfileSelect }>;
type PublicCustomer = Omit<CustomerRow, "avatarStorageKey">;
export function publicCustomer(user: PublicCustomer): PublicCustomer {
  const { id, email, name, avatarUrl, emailVerifiedAt, phone, province, ward, addressDetail } = user;
  return { id, email, name, avatarUrl, emailVerifiedAt, phone, province, ward, addressDetail };
}

const optionalText = (schema: z.ZodString) => z.union([schema, z.null()]).optional();
const clearBlank = (value: unknown) => typeof value === "string" && !value.trim() ? null : value;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.preprocess(clearBlank, optionalText(z.string().trim().min(9).max(24)
    .regex(/^\+?[0-9][0-9 ().-]*$/).refine((value) => value.replace(/\D/g, "").length >= 9, "Số điện thoại cần ít nhất 9 chữ số."))),
  province: z.preprocess(clearBlank, optionalText(z.string().trim().min(2).max(100))),
  ward: z.preprocess(clearBlank, optionalText(z.string().trim().min(2).max(100))),
  addressDetail: z.preprocess(clearBlank, optionalText(z.string().trim().min(5).max(500))),
}).strict().refine((input) => Object.values(input).some((value) => value !== undefined), "Cần ít nhất một thông tin để cập nhật.");
