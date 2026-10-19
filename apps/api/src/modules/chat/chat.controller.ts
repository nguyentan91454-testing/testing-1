import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';

export class ChatController {
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, conversationId } = req.body;
      const userId = req.user?.userId;

      const result = await chatService.processMessage(userId, conversationId, message);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await chatService.getConversationHistory(req.params.conversationId);
      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/health
   * Kiểm tra trạng thái TechBot AI: Gemini API hay local fallback
   */
  static async healthCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await chatService.getHealthStatus();
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
}
