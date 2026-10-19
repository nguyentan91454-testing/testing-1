import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { logger } from '../logger';
import { config } from '../../config';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string;

  if (err instanceof AppError) {
    logger.warn(`[${err.statusCode}] ${err.code}: ${err.message}`, {
      requestId,
      path: req.path,
      method: req.method,
      errors: err.errors,
    });

    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      errors: err.errors,
      requestId,
    });
    return;
  }

  // Unhandled internal server errors
  logger.error(`[500] Unhandled Error: ${err.message}`, {
    requestId,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  const isDevelopment = config.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: isDevelopment ? err.message : 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.',
    requestId,
    stack: isDevelopment ? err.stack : undefined,
  });
}
