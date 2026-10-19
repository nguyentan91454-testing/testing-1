import { Request, Response, NextFunction } from 'express';
import { brandService } from './brand.service';

export class BrandController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const brands = await brandService.getAll();
      res.json({ success: true, data: brands });
    } catch (error) {
      next(error);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const brand = await brandService.getBySlug(req.params.slug);
      res.json({ success: true, data: brand });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const brand = await brandService.create(req.body);
      res.status(201).json({ success: true, data: brand });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const brand = await brandService.update(req.params.id, req.body);
      res.json({ success: true, data: brand });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await brandService.delete(req.params.id);
      res.json({ success: true, message: 'Đã xóa thương hiệu' });
    } catch (error) {
      next(error);
    }
  }
}
