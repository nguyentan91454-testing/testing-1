import { Request, Response, NextFunction } from 'express';
import { wishlistService } from './wishlist.service';

export class WishlistController {
  static async getWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await wishlistService.getWishlist(req.user!.userId);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  static async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.body;
      const result = await wishlistService.toggleWishlist(req.user!.userId, productId);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}
