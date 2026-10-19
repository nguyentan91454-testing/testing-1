import rateLimit from 'express-rate-limit';
import { config } from '../../config';
import { TooManyRequestsError } from '../errors/app-error';

export const generalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new TooManyRequestsError('Quá nhiều yêu cầu từ IP của bạn. Vui lòng thử lại sau 1 phút.'));
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.AUTH_RATE_LIMIT_MAX, // 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new TooManyRequestsError('Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 1 phút trước khi thử lại.'));
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.AI_RATE_LIMIT_MAX, // 20 requests per min
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new TooManyRequestsError('Yêu cầu trợ lý AI quá nhanh. Vui lòng chờ vài giây để hệ thống xử lý.'));
  },
});
