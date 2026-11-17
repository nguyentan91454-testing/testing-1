import { z } from "zod";
import type { Customer } from "./api";

export const phoneSchema = z.string().trim().min(9, "Nhập số điện thoại hợp lệ.").max(24, "Số điện thoại không quá 24 ký tự.")
  .regex(/^\+?[0-9][0-9 ().-]*$/, "Số điện thoại chỉ gồm chữ số và dấu +, cách, (), chấm hoặc gạch ngang.")
  .refine((value) => value.replace(/\D/g, "").length >= 9, "Số điện thoại cần ít nhất 9 chữ số.");
const optionalText = (schema: z.ZodString, message: string) => z.string().trim()
  .refine((value) => !value || schema.safeParse(value).success, message);
export const profileFormSchema = z.object({
  name: z.string().trim().min(2, "Họ tên cần ít nhất 2 ký tự.").max(120, "Họ tên không quá 120 ký tự."),
  phone: optionalText(phoneSchema, "Nhập số điện thoại hợp lệ, có ít nhất 9 chữ số và không quá 24 ký tự."),
  province: optionalText(z.string().min(2).max(100), "Tỉnh / thành phố cần từ 2 đến 100 ký tự."),
  ward: optionalText(z.string().min(2).max(100), "Phường / xã cần từ 2 đến 100 ký tự."),
  addressDetail: optionalText(z.string().min(5).max(500), "Địa chỉ cần từ 5 đến 500 ký tự."),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export function profileFormValues(customer: Customer): ProfileFormValues {
  return { name: customer.name, phone: customer.phone ?? "", province: customer.province ?? "",
    ward: customer.ward ?? "", addressDetail: customer.addressDetail ?? "" };
}

export function checkoutProfileValues(customer: Customer) {
  return { customerName: customer.name, email: customer.email, phone: customer.phone ?? "",
    province: customer.province ?? "", ward: customer.ward ?? "", addressDetail: customer.addressDetail ?? "" };
}
