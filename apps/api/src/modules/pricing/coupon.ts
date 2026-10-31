import { createHash } from "node:crypto";
import type { Coupon, CouponType } from "@prisma/client";
import { HttpError } from "../../http/errors.js";
import type { Discount } from "./pricing.js";

export type CouponIdentity = { phone: string; address: string };

export function requireCouponAccount(customerId: string | undefined): void {
  if (!customerId) throw new HttpError(401, "Đăng nhập Google để sử dụng mã giảm giá", "COUPON_LOGIN_REQUIRED");
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function couponDiscount(coupon: Pick<Coupon, "type" | "value" | "maxDiscountVnd" | "minOrderVnd">): Discount {
  return coupon.type === ("PERCENT" satisfies CouponType)
    ? { kind: "percent", value: coupon.value, maxDiscountVnd: coupon.maxDiscountVnd, minSubtotalVnd: coupon.minOrderVnd }
    : { kind: "fixed", valueVnd: coupon.value, minSubtotalVnd: coupon.minOrderVnd };
}

export function couponIdentityHashes(identity: CouponIdentity) {
  const phone = identity.phone.replace(/[\s()-]/g, "");
  const address = identity.address.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
  return {
    phoneHash: createHash("sha256").update(phone).digest("hex"),
    addressHash: createHash("sha256").update(address).digest("hex"),
  };
}
