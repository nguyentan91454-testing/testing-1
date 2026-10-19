import { Request, Response, NextFunction } from 'express';
import { cartService } from './cart.service';

export class CartController {
  static async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await cartService.getCart(req.user!.userId);
      res.json({ success: true, data: cart });
    } catch (error) {
      next(error);
    }
  }

  static async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, variantId, quantity } = req.body;
      const cart = await cartService.addToCart(req.user!.userId, productId, variantId, quantity);
      res.json({ success: true, message: 'Đã thêm sản phẩm vào giỏ hàng', data: cart });
    } catch (error) {
      next(error);
    }
  }

  static async updateQuantity(req: Request, res: Response, next: NextFunction) {
    try {
      const { quantity } = req.body;
      const cart = await cartService.updateQuantity(req.user!.userId, req.params.itemId, quantity);
      res.json({ success: true, message: 'Đã cập nhật số lượng', data: cart });
    } catch (error) {
      next(error);
    }
  }

  static async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await cartService.removeItem(req.user!.userId, req.params.itemId);
      res.json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng', data: cart });
    } catch (error) {
      next(error);
    }
  }

  static async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await cartService.clearCart(req.user!.userId);
      res.json({ success: true, message: 'Đã làm trống giỏ hàng', data: cart });
    } catch (error) {
      next(error);
    }
  }
}
