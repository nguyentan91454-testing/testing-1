import { prisma } from '../../core/database/prisma';
import { BadRequestError, NotFoundError } from '../../core/errors/app-error';
import { DiscountType } from '@techstore/shared';

export class CouponService {
  async validateCoupon(code: string, subtotal: number, userId?: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestError('Mã giảm giá không tồn tại hoặc đã hết hiệu lực');
    }

    const now = new Date();
    if (now < coupon.startDate) {
      throw new BadRequestError('Chương trình khuyến mãi chưa bắt đầu');
    }

    if (now > coupon.endDate) {
      throw new BadRequestError('Mã giảm giá đã hết hạn sử dụng');
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestError('Mã giảm giá đã hết lượt sử dụng');
    }

    if (subtotal < coupon.minOrderValue) {
      const minFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(coupon.minOrderValue);
      throw new BadRequestError(`Đơn hàng phải đạt tối thiểu ${minFormatted} để áp dụng mã này`);
    }

    // Check if user already used this coupon (if limit per user)
    if (userId) {
      const userUsage = await prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsage > 0 && coupon.code === 'WELCOME10') {
        throw new BadRequestError('Mã chào mừng chỉ áp dụng cho đơn hàng đầu tiên');
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType as DiscountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
      },
      discountAmount,
    };
  }

  async getAll() {
    return prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any) {
    return prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderValue: data.minOrderValue || 0,
        maxDiscountAmount: data.maxDiscountAmount || null,
        usageLimit: data.usageLimit || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async delete(id: string) {
    return prisma.coupon.delete({ where: { id } });
  }
}

export const couponService = new CouponService();
