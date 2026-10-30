import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { HttpError } from "../../http/errors.js";
import { optionalCustomer } from "../../http/customer-auth.js";
import { prisma } from "../../lib/prisma.js";
import { calculatePrice } from "../pricing/pricing.js";
import { couponDiscount, normalizeCouponCode } from "../pricing/coupon.js";

const cookieName = "cart_session";
const cartCookieOptions = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/v1", maxAge: 30 * 24 * 60 * 60 * 1000 };
const itemSchema = z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(10) });

export const cartRouter = Router();
cartRouter.use(optionalCustomer);

async function getCart(request: Parameters<Parameters<typeof cartRouter.get>[1]>[0], response: Parameters<Parameters<typeof cartRouter.get>[1]>[1]) {
  let sessionId = request.cookies?.[cookieName] as string | undefined;
  if (!sessionId || !/^[a-f0-9]{64}$/.test(sessionId)) {
    sessionId = randomBytes(32).toString("hex");
    response.cookie(cookieName, sessionId, cartCookieOptions);
  }
  let cart = await prisma.cart.findFirst({ where: { sessionId } });
  if (!cart) cart = await prisma.cart.create({ data: { sessionId, userId: request.customer?.id ?? null } });
  else if (request.customer && cart.userId !== request.customer.id) cart = await prisma.cart.update({ where: { id: cart.id }, data: { userId: request.customer.id } });
  return cart;
}

async function readCart(cartId: string) {
  const cart = await prisma.cart.findUnique({ where: { id: cartId }, include: { coupon: true } });
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: { variant: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } }, options: { include: { value: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const variantItems = items.filter((item) => item.variant !== null);
  const subtotalVnd = variantItems.reduce((sum, item) => sum + item.variant!.priceVnd * item.quantity, 0);
  const coupon = cart?.coupon && !cart.coupon.newCustomerOnly && cart.coupon.isActive && cart.coupon.startsAt <= new Date() && cart.coupon.endsAt > new Date() ? cart.coupon : null;
  const price = calculatePrice({ subtotalVnd, shippingFeeGrossVnd: 0, freeShippingThresholdVnd: null, shippingSubsidyCapVnd: null, discount: coupon ? couponDiscount(coupon) : null });
  return {
    coupon: cart?.coupon ? { code: cart.coupon.code, discountVnd: price.discountVnd, requiresCheckoutValidation: cart.coupon.newCustomerOnly } : null,
    items: variantItems.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      sku: item.variant!.sku,
      productName: item.variant!.product.name,
      image: item.variant!.product.images[0] ?? null,
      quantity: item.quantity,
      unitPriceVnd: item.variant!.priceVnd,
      lineTotalVnd: item.variant!.priceVnd * item.quantity,
      availableStock: item.variant!.stockQty,
      isAvailable: item.variant!.product.status === "ACTIVE" && item.variant!.product.isActive && item.variant!.isAvailable && item.variant!.stockQty >= item.quantity,
    })),
    price,
  };
}

cartRouter.get("/", async (request, response, next) => {
  try {
    const cart = await getCart(request, response);
    response.json({ success: true, data: await readCart(cart.id) });
  } catch (error) { next(error); }
});

cartRouter.post("/coupon", async (request, response, next) => {
  try {
    const { code } = z.object({ code: z.string().trim().min(1).max(64) }).parse(request.body);
    const normalizedCode = normalizeCouponCode(code);
    const cart = await getCart(request, response);
    const items = await prisma.cartItem.findMany({ where: { cartId: cart.id, variantId: { not: null } }, include: { variant: true } });
    const subtotalVnd = items.reduce((sum, item) => sum + (item.variant?.priceVnd ?? 0) * item.quantity, 0);
    const coupon = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
    const now = new Date();
    if (!coupon || !coupon.isActive || coupon.startsAt > now || coupon.endsAt <= now) throw new HttpError(400, "Mã giảm giá không hợp lệ hoặc đã hết hạn", "COUPON_INVALID");
    if (subtotalVnd < coupon.minOrderVnd) throw new HttpError(400, "Giá trị đơn hàng chưa đạt mức tối thiểu của mã giảm giá", "COUPON_MIN_ORDER");
    if (coupon.totalLimit !== null && await prisma.couponRedemption.count({ where: { couponId: coupon.id } }) >= coupon.totalLimit) throw new HttpError(400, "Mã giảm giá đã hết lượt sử dụng", "COUPON_LIMIT_REACHED");
    await prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
    response.json({ success: true, data: await readCart(cart.id) });
  } catch (error) { next(error); }
});

cartRouter.delete("/coupon", async (request, response, next) => {
  try {
    const cart = await getCart(request, response);
    await prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    response.json({ success: true, data: await readCart(cart.id) });
  } catch (error) { next(error); }
});

cartRouter.post("/items", async (request, response, next) => {
  try {
    const input = itemSchema.parse(request.body);
    const cart = await getCart(request, response);
    const variant = await prisma.variant.findFirst({ where: { id: input.variantId, isAvailable: true, product: { status: "ACTIVE", isActive: true } } });
    if (!variant) throw new HttpError(404, "Sản phẩm không còn được bán", "VARIANT_NOT_AVAILABLE");
    const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } } });
    const quantity = input.quantity + (existing?.quantity ?? 0);
    if (quantity > variant.stockQty) throw new HttpError(409, "Số lượng vượt quá tồn kho hiện có", "INSUFFICIENT_STOCK");
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      update: { quantity },
      create: { cartId: cart.id, variantId: variant.id, quantity },
    });
    response.status(201).json({ success: true, data: await readCart(cart.id), message: "Đã thêm sản phẩm vào giỏ" });
  } catch (error) { next(error); }
});

cartRouter.patch("/items/:itemId", async (request, response, next) => {
  try {
    const { quantity } = z.object({ quantity: z.number().int().min(1).max(10) }).parse(request.body);
    const { itemId } = z.object({ itemId: z.string().uuid() }).parse(request.params);
    const cart = await getCart(request, response);
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: true } });
    if (!item) throw new HttpError(404, "Không tìm thấy sản phẩm trong giỏ", "CART_ITEM_NOT_FOUND");
    if (!item.variant || quantity > item.variant.stockQty) throw new HttpError(409, "Số lượng vượt quá tồn kho hiện có", "INSUFFICIENT_STOCK");
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    response.json({ success: true, data: await readCart(cart.id) });
  } catch (error) { next(error); }
});

cartRouter.delete("/items/:itemId", async (request, response, next) => {
  try {
    const { itemId } = z.object({ itemId: z.string().uuid() }).parse(request.params);
    const cart = await getCart(request, response);
    await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    response.json({ success: true, data: await readCart(cart.id) });
  } catch (error) { next(error); }
});

cartRouter.delete("/items", async (request, response, next) => {
  try {
    const cart = await getCart(request, response);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    response.json({ success: true, data: await readCart(cart.id) });
  } catch (error) { next(error); }
});

