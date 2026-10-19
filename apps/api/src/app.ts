import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { requestIdMiddleware } from './core/middlewares/request-id.middleware';
import { generalRateLimiter } from './core/middlewares/rate-limit.middleware';
import { errorHandler } from './core/middlewares/error.middleware';
import { NotFoundError } from './core/errors/app-error';
import { swaggerDoc } from './swagger';
import apiRouter from './routes';

export function createApp(): express.Application {
  const app = express();

  // 1. Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Tuned for dev & SPA integration
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS
  const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin || allowedOrigins.includes(origin) || config.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    })
  );

  // 3. Body Parsing & Cookies
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(config.COOKIE_SECRET));
  app.use(compression());

  // 4. Request ID & Rate Limiting
  app.use(requestIdMiddleware);
  app.use('/api', generalRateLimiter);

  // 5. Health Check
  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'techstore-api',
      environment: config.NODE_ENV,
    });
  });

  // 6. Swagger API Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

  // 7. API Routes v1
  app.use('/api/v1', apiRouter);

  // 8. 404 Handler
  app.use('*', (req, res, next) => {
    next(new NotFoundError(`Đường dẫn ${req.originalUrl} không tồn tại trên hệ thống API`));
  });

  // 9. Global Exception Filter Middleware
  app.use(errorHandler);

  return app;
}
