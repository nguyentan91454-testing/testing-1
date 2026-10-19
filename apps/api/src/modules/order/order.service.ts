import { prisma } from '../../core/database/prisma';
import { mockPaymentProvider } from '../payment/mock-payment.provider';
import { couponService } from '../coupon/coupon.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../core/errors/app-error';
import { OrderStatus, PaymentStatus, PaymentMethod, APP_DEFAULTS, ProductStatus } from '@techstore/shared';
import * as crypto from 'crypto';

export class OrderService {
  private formatOrder(order: any) {
    return {
      id: order.id,
      orderCode: order.orderCode,
      userId: order.userId,
      user: order.user ? {
        fullName: order.user.fullName,
        email: order.user.email,
        phone: order.user.phone,
      } : undefined,
      status: order.status as OrderStatus,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      shippingFee: order.shippingFee,
      totalAmount: order.totalAmount,
      shippingAddress: typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress,
      paymentMethod: order.paymentMethod as PaymentMethod,
      paymentStatus: order.paymentStatus as PaymentStatus,
      payment: order.payment ? {
        id: order.payment.id,
        orderId: order.payment.orderId,
        amount: order.payment.amount,
        method: order.payment.method as PaymentMethod,
        status: order.payment.status as PaymentStatus,
        transactionId: order.payment.transactionId,
        paymentDetails: order.payment.paymentDetails ? (typeof order.payment.paymentDetails === 'string' ? JSON.parse(order.payment.paymentDetails) : order.payment.paymentDetails) : null,
        paidAt: order.payment.paidAt ? order.payment.paidAt.toISOString() : null,
      } : null,
      couponCode: order.couponCode,
      customerNote: order.customerNote,
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        productImage: item.productImage,
        variantId: item.variantId,
        variantName: item.variantName,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  async createOrder(userId: string, data: {
    shippingAddress: any;
    paymentMethod: PaymentMethod;
    couponCode?: string | null;
    customerNote?: string | null;
    items: Array<{ productId: string; variantId?: string | null; quantity: number }>;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestError('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    const orderDate = new Date();
    const datePrefix = `${orderDate.getFullYear()}${(orderDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderCode = `TS-${datePrefix}-${randomSuffix}`;

    // Execute within ACID Database Transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsToCreate: any[] = [];
      const stockUpdates: Array<{ productId: string; variantId?: string | null; quantity: number }> = [];

      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            variants: true,
          },
        });

        if (!product || product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestError(`Sản phẩm "${product?.name || item.productId}" không tồn tại hoặc đã ngừng kinh doanh`);
        }

        let unitPrice = product.salePrice ?? product.price;
        let variantName: string | null = null;
        let availableStock = product.stock;

        if (item.variantId) {
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) {
            throw new BadRequestError(`Biến thể của "${product.name}" không tồn tại`);
          }
          unitPrice = variant.salePrice ?? variant.price;
          variantName = variant.name;
          availableStock = variant.stock;
        }

        if (availableStock < item.quantity) {
          throw new BadRequestError(`Sản phẩm "${product.name}" chỉ còn ${availableStock} trong kho (bạn đặt ${item.quantity})`);
        }

        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;

        orderItemsToCreate.push({
          productId: product.id,
          variantId: item.variantId || null,
          productName: product.name,
          productSlug: product.slug,
          productImage: product.images[0]?.url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
          variantName,
          price: unitPrice,
          quantity: item.quantity,
          total: itemTotal,
        });

        stockUpdates.push({
          productId: product.id,
          variantId: item.variantId || null,
          quantity: item.quantity,
        });
      }

      // Calculate Coupon Discount
      let discountAmount = 0;
      let validCoupon: any = null;

      if (data.couponCode) {
        const couponValidation = await couponService.validateCoupon(data.couponCode, subtotal, userId);
        discountAmount = couponValidation.discountAmount;
        validCoupon = couponValidation.coupon;
      }

      const shippingFee = subtotal >= APP_DEFAULTS.FREE_SHIPPING_THRESHOLD ? 0 : APP_DEFAULTS.STANDARD_SHIPPING_FEE;
      const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderCode,
          userId,
          status: OrderStatus.CONFIRMED,
          subtotal,
          discountAmount,
          shippingFee,
          totalAmount,
          shippingAddress: JSON.stringify(data.shippingAddress),
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentMethod === PaymentMethod.COD ? PaymentStatus.PENDING : PaymentStatus.PAID,
          couponCode: data.couponCode || null,
          customerNote: data.customerNote || null,
          items: {
            create: orderItemsToCreate,
          },
        },
      });

      // Atomically decrement stock
      for (const update of stockUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: {
            stock: { decrement: update.quantity },
          },
        });

        if (update.variantId) {
          await tx.productVariant.update({
            where: { id: update.variantId },
            data: {
              stock: { decrement: update.quantity },
            },
          });
        }
      }

      // Record coupon usage
      if (validCoupon) {
        await tx.coupon.update({
          where: { id: validCoupon.id },
          data: { usageCount: { increment: 1 } },
        });

        await tx.couponUsage.create({
          data: {
            couponId: validCoupon.id,
            userId,
            orderId: newOrder.id,
            discountAmount,
          },
        });
      }

      // Process Payment Intent via Payment Provider
      const paymentIntent = await mockPaymentProvider.createPayment(newOrder.id, totalAmount, data.paymentMethod);

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: totalAmount,
          method: data.paymentMethod,
          status: paymentIntent.status,
          transactionId: paymentIntent.transactionId,
          paymentDetails: paymentIntent.details ? JSON.stringify(paymentIntent.details) : null,
          paidAt: paymentIntent.status === PaymentStatus.PAID ? new Date() : null,
        },
      });

      // Clear user's cart
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ORDER_CREATED',
          resource: 'ORDER',
          resourceId: newOrder.id,
          details: JSON.stringify({ orderCode, totalAmount, paymentMethod: data.paymentMethod }),
        },
      });

      return newOrder;
    });

    // Fetch full order with relations
    const fullOrder = await prisma.order.findUnique({
      where: { id: createdOrder.id },
      include: {
        items: true,
        payment: true,
        user: { select: { fullName: true, email: true, phone: true } },
      },
    });

    return this.formatOrder(fullOrder);
  }

  async getMyOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payment: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: orders.map((o) => this.formatOrder(o)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getOrderById(orderIdOrCode: string, userId?: string, isAdmin = false) {
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderIdOrCode }, { orderCode: orderIdOrCode }],
      },
      include: {
        items: true,
        payment: true,
        user: { select: { fullName: true, email: true, phone: true } },
      },
    });

    if (!order) {
      throw new NotFoundError('Không tìm thấy đơn hàng');
    }

    if (!isAdmin && userId && order.userId !== userId) {
      throw new ForbiddenError('Bạn không có quyền xem đơn hàng này');
    }

    return this.formatOrder(order);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, note?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });

    if (!order) {
      throw new NotFoundError('Không tìm thấy đơn hàng');
    }

    // If order is cancelled, restore stock in transaction
    if (status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.CANCELLED },
        });
      });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { status },
      });
    }

    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true, user: true },
    });

    return this.formatOrder(updated);
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError('Không tìm thấy đơn hàng');
    }

    if (order.userId !== userId) {
      throw new ForbiddenError('Bạn không thể hủy đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestError('Đơn hàng đã được xử lý/giao hàng, không thể tự hủy');
    }

    return this.updateOrderStatus(orderId, OrderStatus.CANCELLED, 'Khách hàng yêu cầu hủy đơn');
  }
}

export const orderService = new OrderService();
