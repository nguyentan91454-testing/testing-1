import { Prisma } from "@prisma/client";
import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { calculatePrice } from "../pricing/pricing.js";
import { couponDiscount, couponIdentityHashes } from "../pricing/coupon.js";

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(9).max(24),
  email: z.string().email().max(254),
  province: z.string().trim().min(2).max(100),
  ward: z.string().trim().min(2).max(100),
  addressDetail: z.string().trim().min(5).max(300),
  paymentMethod: z.enum(["COD", "VIETQR"]),
  note: z.string().trim().max(1000).optional(),
});

const checkoutPolicySchema = z.object({
  shippingFeeVnd: z.number().int().nonnegative(),
  freeShippingThresholdVnd: z.number().int().nonnegative(),
  shippingSubsidyCapVnd: z.number().int().nonnegative(),
  fullCodLimitVnd: z.number().int().positive(),
  depositLimitVnd: z.number().int().positive(),
  depositRatePercent: z.number().int().min(1).max(99),
});
type CheckoutLine = { variantId: string; sku: string; productName: string; variantName: string | null; priceVnd: number; quantity: number };

const cartCookie = "cart_session";
const normalizePhone = (value: string) => {
  const compact = value.replace(/[\s()-]/g, "");
  const normalized = compact.startsWith("+84") ? `0${compact.slice(3)}` : compact;
  if (!/^0\d{9,10}$/.test(normalized)) throw new HttpError(400, "Số điện thoại Việt Nam không hợp lệ", "INVALID_PHONE");
  return normalized;
};
const orderCode = () => `DEMO-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

export const checkoutRouter = Router();

checkoutRouter.post("/", async (request, response, next) => {
  try {
    const input = checkoutSchema.parse(request.body);
    const idempotencyKey = z.string().uuid().parse(request.get("idempotency-key"));
    const sessionId = request.cookies?.[cartCookie] as string | undefined;
    if (!sessionId || !/^[a-f0-9]{64}$/.test(sessionId)) throw new HttpError(400, "Giỏ hàng không hợp lệ", "CART_SESSION_REQUIRED");

    const previous = await prisma.order.findUnique({ where: { idempotencyKey }, select: { id: true, code: true, totalVnd: true, paymentStatus: true, orderStatus: true } });
    if (previous) {
      response.status(200).json({ success: true, data: previous, message: "Đơn đã được tạo trước đó" });
      return;
    }

    const normalizedPhone = normalizePhone(input.phone);
    const order = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({ where: { sessionId }, include: { coupon: true } });
      if (!cart) throw new HttpError(400, "Giỏ hàng đang trống", "CART_EMPTY");
      const items = await tx.cartItem.findMany({
        where: { cartId: cart.id },
        include: { variant: { include: { product: true, options: { include: { value: true } } } } },
      });
      if (items.length === 0) throw new HttpError(400, "Giỏ hàng đang trống", "CART_EMPTY");
      for (const item of items) {
        if (!item.variant) throw new HttpError(422, "Checkout bundle chưa được bật trong API này", "BUNDLE_CHECKOUT_UNAVAILABLE");
        if (!item.variant.isAvailable || item.variant.product.status !== "ACTIVE" || !item.variant.product.isActive) {
          throw new HttpError(409, "Một sản phẩm trong giỏ không còn được bán", "VARIANT_NOT_AVAILABLE");
        }
      }

      const settings = await tx.setting.findUnique({ where: { key: "checkout_policy" }, select: { value: true } });
      const policy = checkoutPolicySchema.parse(settings?.value ?? {
        shippingFeeVnd: 35_000, freeShippingThresholdVnd: 1_000_000, shippingSubsidyCapVnd: 30_000,
        fullCodLimitVnd: 1_500_000, depositLimitVnd: 4_000_000, depositRatePercent: 30,
      });
      const lines: CheckoutLine[] = items.map((item) => ({
        variantId: item.variant!.id,
        sku: item.variant!.sku,
        productName: item.variant!.product.name,
        variantName: item.variant!.options.map((option) => option.value.label).join(" / ") || null,
        priceVnd: item.variant!.priceVnd,
        quantity: item.quantity,
      }));
      const subtotalVnd = lines.reduce((sum, line) => sum + line.priceVnd * line.quantity, 0);
      let coupon = cart.couponId ? await tx.coupon.findUnique({ where: { id: cart.couponId } }) : null;
      let couponHashes: ReturnType<typeof couponIdentityHashes> | null = null;
      if (cart.couponId) {
        const now = new Date();
        if (!coupon || !coupon.isActive || coupon.startsAt > now || coupon.endsAt <= now) throw new HttpError(400, "Mã giảm giá không hợp lệ hoặc đã hết hạn", "COUPON_INVALID");
        if (subtotalVnd < coupon.minOrderVnd) throw new HttpError(400, "Giá trị đơn hàng chưa đạt mức tối thiểu của mã giảm giá", "COUPON_MIN_ORDER");
        couponHashes = couponIdentityHashes({ phone: normalizedPhone, address: `${input.province}|${input.ward}|${input.addressDetail}` });
        const previousCustomerOrder = await tx.order.findFirst({ where: { OR: [
          { phone: normalizedPhone },
          { province: { equals: input.province, mode: "insensitive" }, ward: { equals: input.ward, mode: "insensitive" }, addressDetail: { equals: input.addressDetail, mode: "insensitive" } },
        ] }, select: { id: true } });
        if (coupon.newCustomerOnly && previousCustomerOrder) throw new HttpError(400, "Mã này chỉ áp dụng cho khách hàng mới", "COUPON_NEW_CUSTOMER_ONLY");
        const redemptions = await tx.couponRedemption.count({ where: { couponId: coupon.id, OR: [
          { phoneHash: couponHashes.phoneHash }, { addressHash: couponHashes.addressHash },
        ] } });
        if (coupon.perUserLimit <= redemptions) throw new HttpError(400, "Bạn đã sử dụng hết lượt của mã giảm giá này", "COUPON_USER_LIMIT_REACHED");
        const totalRedemptions = await tx.couponRedemption.count({ where: { couponId: coupon.id } });
        if (coupon.totalLimit !== null && totalRedemptions >= coupon.totalLimit) throw new HttpError(400, "Mã giảm giá đã hết lượt sử dụng", "COUPON_LIMIT_REACHED");
      }
      const price = calculatePrice({
        subtotalVnd,
        shippingFeeGrossVnd: policy.shippingFeeVnd,
        freeShippingThresholdVnd: policy.freeShippingThresholdVnd,
        shippingSubsidyCapVnd: policy.shippingSubsidyCapVnd,
        discount: coupon ? couponDiscount(coupon) : null,
      });
      const risk = await tx.customerRisk.findUnique({ where: { phone: normalizedPhone } });
      const highRisk = (risk?.returnedCount ?? 0) > 0 || (risk?.boomCount ?? 0) > 0;
      const totalVnd = price.totalVnd;
      let requiredPaymentVnd = 0;
      if (input.paymentMethod === "VIETQR" || highRisk || totalVnd > policy.depositLimitVnd) {
        requiredPaymentVnd = totalVnd;
      } else if (totalVnd >= policy.fullCodLimitVnd) {
        requiredPaymentVnd = Number((BigInt(totalVnd) * BigInt(policy.depositRatePercent)) / 100n);
      }
      if (input.paymentMethod === "COD" && requiredPaymentVnd === totalVnd && totalVnd > 0) {
        throw new HttpError(400, "Đơn này cần thanh toán trước qua VietQR", "PREPAYMENT_REQUIRED");
      }

      for (const line of lines) {
        const reserved = await tx.variant.updateMany({
          where: { id: line.variantId, isAvailable: true, stockQty: { gte: line.quantity } },
          data: { stockQty: { decrement: line.quantity } },
        });
        if (reserved.count !== 1) throw new HttpError(409, "Sản phẩm vừa hết tồn kho, vui lòng tải lại giỏ hàng", "INSUFFICIENT_STOCK");
      }

      const code = orderCode();
      const created = await tx.order.create({
        data: {
          code,
          idempotencyKey,
          customerName: input.customerName,
          phone: normalizedPhone,
          email: input.email.toLowerCase(),
          province: input.province,
          ward: input.ward,
          addressDetail: input.addressDetail,
          subtotalVnd: price.subtotalVnd,
          discountVnd: price.discountVnd,
          shippingFeeGrossVnd: price.shippingFeeGrossVnd,
          shippingFeeCustomerVnd: price.shippingFeeCustomerVnd,
          shippingSubsidyVnd: price.shippingSubsidyVnd,
          totalVnd,
          couponId: coupon?.id ?? null,
          depositRequiredVnd: requiredPaymentVnd,
          paidVnd: 0,
          codAmountVnd: totalVnd - requiredPaymentVnd,
          paymentMethod: input.paymentMethod,
          orderStatus: "PENDING",
          paymentStatus: requiredPaymentVnd > 0 ? "DEPOSIT_PENDING" : "COD_PENDING",
          reservationExpiresAt: requiredPaymentVnd > 0 ? new Date(Date.now() + 30 * 60_000) : null,
          isDemo: true,
          ...(input.note === undefined ? {} : { note: input.note }),
        },
      });
      await tx.orderItem.createMany({ data: lines.map((line) => ({
        orderId: created.id,
        variantId: line.variantId,
        sku: line.sku,
        productName: line.productName,
        variantName: line.variantName,
        unitPriceVnd: line.priceVnd,
        quantity: line.quantity,
      })) });
      if (coupon && couponHashes) {
        await tx.couponRedemption.create({ data: {
          couponId: coupon.id,
          orderId: created.id,
          phone: normalizedPhone,
          phoneHash: couponHashes.phoneHash,
          addressHash: couponHashes.addressHash,
          isNewCustomer: coupon.newCustomerOnly,
        } });
      }
      if (requiredPaymentVnd > 0) {
        await tx.payment.create({ data: {
          orderId: created.id,
          provider: "MOCK",
          type: requiredPaymentVnd === totalVnd ? "FULL" : "DEPOSIT",
          amountVnd: requiredPaymentVnd,
          status: "PENDING",
        } });
      }
      await tx.orderEvent.create({ data: { orderId: created.id, type: "CHECKOUT_CREATED", toStatus: "PENDING", actor: "customer" } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    response.status(201).json({
      success: true,
      data: { id: order.id, code: order.code, totalVnd: order.totalVnd, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus, codAmountVnd: order.codAmountVnd, depositRequiredVnd: order.depositRequiredVnd, isDemo: true },
      message: "Đơn hàng demo đã được tạo",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const idempotencyKey = request.get("idempotency-key");
      if (idempotencyKey) {
        const previous = await prisma.order.findUnique({ where: { idempotencyKey }, select: { id: true, code: true, totalVnd: true, paymentStatus: true, orderStatus: true } });
        if (previous) { response.status(200).json({ success: true, data: previous }); return; }
      }
    }
    next(error);
  }
});

