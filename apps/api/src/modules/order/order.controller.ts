import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service';
import { Role } from '@techstore/shared';

export class OrderController {
  static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.createOrder(req.user!.userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Đặt hàng thành công',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await orderService.getMyOrders(req.user!.userId, page, limit);

      res.json({
        success: true,
        data: result.items,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user?.role === Role.ADMIN || req.user?.role === Role.SUPER_ADMIN;
      const order = await orderService.getOrderById(req.params.id, req.user?.userId, isAdmin);

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.cancelOrder(req.params.id, req.user!.userId);
      res.json({
        success: true,
        message: 'Đã hủy đơn hàng thành công',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, note } = req.body;
      const order = await orderService.updateOrderStatus(req.params.id, status, note);
      res.json({
        success: true,
        message: 'Cập nhật trạng thái đơn hàng thành công',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
}
