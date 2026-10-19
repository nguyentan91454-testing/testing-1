import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';

export class ProductController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.queryProducts(req.query as any);
      res.json({
        success: true,
        data: result.items,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 8;
      const products = await productService.getFeaturedProducts(limit);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getBySlug(req.params.slug);

      // Track product view (async, non-blocking)
      const userId = (req as any).user?.userId;
      const sessionId = req.headers['x-session-id'] as string;
      productService.trackProductView(product.id, userId, sessionId).catch(() => {});

      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getById(req.params.id);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.create(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.update(req.params.id, req.body);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.delete(req.params.id);
      res.json({ success: true, message: 'Đã xóa sản phẩm thành công' });
    } catch (error) {
      next(error);
    }
  }

  // ---- Recommendation endpoints ----
  static async getSimilar(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 6;
      const products = await productService.getSimilarProducts(req.params.id, limit);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  static async getFrequentlyBoughtTogether(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 4;
      const products = await productService.getFrequentlyBoughtTogether(req.params.id, limit);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  static async getPersonalized(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        const featured = await productService.getFeaturedProducts(8);
        return res.json({ success: true, data: featured });
      }
      const limit = req.query.limit ? Number(req.query.limit) : 8;
      const products = await productService.getPersonalizedRecommendations(userId, limit);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }
}
