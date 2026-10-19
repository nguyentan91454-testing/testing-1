import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';

export class AdminController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 30;
      const logs = await adminService.getAuditLogs(page, limit);
      res.json({ success: true, ...logs });
    } catch (error) {
      next(error);
    }
  }
}
