import { Request, Response, NextFunction } from 'express';
import { couponService } from './coupon.service';
import { cartService } from '../cart/cart.service';

export class CouponController {
  static async validateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const cart = await cartService.getCart(req.user!.userId);
      const result = await couponService.validateCoupon(code, cart.subtotal, req.user!.userId);

      res.json({
        success: true,
        message: 'Áp dụng mã giảm giá thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const coupons = await couponService.getAll();
      res.json({ success: true, data: coupons });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await couponService.create(req.body);
      res.status(201).json({ success: true, data: coupon });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await couponService.delete(req.params.id);
      res.json({ success: true, message: 'Đã xóa mã giảm giá' });
    } catch (error) {
      next(error);
    }
  }
}
