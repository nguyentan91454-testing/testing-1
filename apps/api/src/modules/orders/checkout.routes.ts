import { Prisma } from "@prisma/client";
import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { optionalCustomer } from "../../http/customer-auth.js";
import { calculatePrice } from "../pricing/pricing.js";
import { couponDiscount, couponIdentityHashes, requireCouponAccount } from "../pricing/coupon.js";
import { buildMockVietQr, getMockPaymentStatus } from "./mock-payment.js";
import { notifyEmailWorker, recordOrderEmail } from "../email/email.service.js";

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

export const checkoutRouter = Router();

function checkoutPayment(orderCode: string, payment: { id: string; type: "FULL" | "DEPOSIT" | "COD"; amountVnd: number; status: "PENDING" | "SUCCEEDED" | "FAILED" } | null) {
  if (!payment || payment.status !== "PENDING") return null;
  return { id: payment.id, type: payment.type, amountVnd: payment.amountVnd, provider: "MOCK", qr: buildMockVietQr(orderCode, payment.amountVnd) };
}

checkoutRouter.post("/:orderId/pay-mock", async (request, response, next) => {
  try {
    if (process.env.NODE_ENV === "production") throw new HttpError(404, "Không tìm thấy tài nguyên", "NOT_FOUND");
    const { orderId } = z.object({ orderId: z.string().uuid() }).parse(request.params);
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new HttpError(404, "Không tìm thấy đơn hàng", "ORDER_NOT_FOUND");
      const payment = await tx.payment.findFirst({ where: { orderId, provider: "MOCK" }, orderBy: { createdAt: "desc" } });
      if (!payment) throw new HttpError(409, "Đơn hàng không có khoản thanh toán demo", "MOCK_PAYMENT_NOT_FOUND");
      if (payment.status === "SUCCEEDED") return { order, alreadyProcessed: true, emailLogId: null };
      if (payment.status !== "PENDING" || order.paymentStatus !== "DEPOSIT_PENDING" || order.orderStatus !== "PENDING") {
        throw new HttpError(409, "Khoản thanh toán không còn chờ xác nhận", "MOCK_PAYMENT_NOT_PENDING");
      }
      if (order.reservationExpiresAt && order.reservationExpiresAt <= new Date()) throw new HttpError(409, "Thời hạn thanh toán của đơn đã hết", "PAYMENT_RESERVATION_EXPIRED");
      const paidVnd = order.paidVnd + payment.amountVnd;
      const paymentStatus = getMockPaymentStatus(order.totalVnd, order.paidVnd, payment.amountVnd);
      const changedPayment = await tx.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "SUCCEEDED", providerTxnId: `MOCK-${payment.id}` } });
      if (changedPayment.count !== 1) throw new HttpError(409, "Khoản thanh toán vừa được xử lý", "MOCK_PAYMENT_ALREADY_PROCESSED");
      const changedOrder = await tx.order.updateMany({ where: { id: order.id, paymentStatus: "DEPOSIT_PENDING", orderStatus: "PENDING" }, data: { paidVnd, paymentStatus } });
      if (changedOrder.count !== 1) throw new HttpError(409, "Đơn hàng vừa thay đổi, vui lòng tải lại", "ORDER_CHANGED");
      await tx.orderEvent.create({ data: { orderId, type: "MOCK_PAYMENT_CONFIRMED", actor: "mock-payment", payload: { paymentId: payment.id, amountVnd: payment.amountVnd } } });
      const emailLogId = await recordOrderEmail(tx, orderId, "PAYMENT_RECEIVED", order.email);
      return { order: { ...order, paidVnd, paymentStatus }, alreadyProcessed: false, emailLogId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.emailLogId) await notifyEmailWorker(result.emailLogId);
    response.json({ success: true, data: { id: result.order.id, code: result.order.code, paidVnd: result.order.paidVnd, paymentStatus: result.order.paymentStatus, orderStatus: result.order.orderStatus, alreadyProcessed: result.alreadyProcessed } });
  } catch (error) { next(error); }
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

checkoutRouter.post("/", optionalCustomer, async (request, response, next) => {
  try {
    const input = checkoutSchema.parse(request.body);
    const idempotencyKey = z.string().uuid().parse(request.get("idempotency-key"));
    const sessionId = request.cookies?.[cartCookie] as string | undefined;
    if (!sessionId || !/^[a-f0-9]{64}$/.test(sessionId)) throw new HttpError(400, "Giỏ hàng không hợp lệ", "CART_SESSION_REQUIRED");

    const previous = await prisma.order.findUnique({ where: { idempotencyKey }, select: { id: true, code: true, totalVnd: true, paymentStatus: true, orderStatus: true, payments: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, type: true, amountVnd: true, status: true } } } });
    if (previous) {
      Object.assign(previous, { payment: checkoutPayment(previous.code, previous.payments[0] ?? null) });
      response.status(200).json({ success: true, data: previous, message: "Đơn đã được tạo trước đó" });
      return;
    }

    const normalizedPhone = normalizePhone(input.phone);
    const order = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({ where: { sessionId }, include: { coupon: true } });
      if (!cart) throw new HttpError(400, "Giỏ hàng đang trống", "CART_EMPTY");
      if (cart.couponId) requireCouponAccount(request.customer?.id);
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
        const identityLimits = [
          { phoneHash: couponHashes.phoneHash },
          { addressHash: couponHashes.addressHash },
          ...(request.customer ? [{ userId: request.customer.id }] : []),
        ];
        const redemptions = await tx.couponRedemption.count({ where: { couponId: coupon.id, OR: identityLimits } });
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
          userId: request.customer?.id ?? null,
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
          userId: request.customer?.id ?? null,
          phone: normalizedPhone,
          phoneHash: couponHashes.phoneHash,
          addressHash: couponHashes.addressHash,
          isNewCustomer: coupon.newCustomerOnly,
        } });
      }
      let createdPayment = null;
      if (requiredPaymentVnd > 0) {
        createdPayment = await tx.payment.create({ data: {
          orderId: created.id,
          provider: "MOCK",
          type: requiredPaymentVnd === totalVnd ? "FULL" : "DEPOSIT",
          amountVnd: requiredPaymentVnd,
          status: "PENDING",
        } });
      }
      await tx.orderEvent.create({ data: { orderId: created.id, type: "CHECKOUT_CREATED", toStatus: "PENDING", actor: "customer" } });
      const emailLogId = await recordOrderEmail(tx, created.id, "ORDER_CONFIRMATION", created.email);
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } });
      return { order: created, payment: createdPayment, emailLogId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const { order: createdOrder, payment: createdPayment } = order;
    await notifyEmailWorker(order.emailLogId);
    response.status(201).json({
      success: true,
      data: { id: createdOrder.id, code: createdOrder.code, totalVnd: createdOrder.totalVnd, paymentStatus: createdOrder.paymentStatus, orderStatus: createdOrder.orderStatus, codAmountVnd: createdOrder.codAmountVnd, depositRequiredVnd: createdOrder.depositRequiredVnd, payment: checkoutPayment(createdOrder.code, createdPayment), isDemo: true },
      message: "Đơn hàng demo đã được tạo",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const idempotencyKey = request.get("idempotency-key");
      if (idempotencyKey) {
        const previous = await prisma.order.findUnique({ where: { idempotencyKey }, select: { id: true, code: true, totalVnd: true, paymentStatus: true, orderStatus: true, payments: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, type: true, amountVnd: true, status: true } } } });
        if (previous) { response.status(200).json({ success: true, data: { ...previous, payment: checkoutPayment(previous.code, previous.payments[0] ?? null) } }); return; }
      }
    }
    next(error);
  }
});

