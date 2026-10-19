import { Request, Response, NextFunction } from 'express';
import { reviewService } from './review.service';

export class ReviewController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await reviewService.createReview(req.user!.userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Cảm ơn bạn đã đánh giá sản phẩm!',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getByProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const reviews = await reviewService.getProductReviews(req.params.productId);
      res.json({ success: true, data: reviews });
    } catch (error) {
      next(error);
    }
  }
}
