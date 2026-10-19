import { createApp } from './app';
import { config } from './config';
import { logger } from './core/logger';
import { prisma } from './core/database/prisma';

async function bootstrap() {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('🗄️ Connected to database successfully.');

    const app = createApp();

    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 TechStore API is running at: http://localhost:${config.PORT}`);
      logger.info(`📖 Swagger API Documentation: http://localhost:${config.PORT}/api/docs`);
      logger.info(`🏥 Health Check endpoint: http://localhost:${config.PORT}/health`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Closed out remaining connections. Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error: any) {
    logger.error(`❌ Failed to start server: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
}

bootstrap();
