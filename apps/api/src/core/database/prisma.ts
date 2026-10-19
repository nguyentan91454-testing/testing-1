import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

// Log queries in debug mode
// @ts-ignore
prisma.$on('query', (e: any) => {
  if (process.env.DEBUG_SQL === 'true') {
    logger.debug(`[Prisma Query] ${e.query} (${e.duration}ms)`);
  }
});

// @ts-ignore
prisma.$on('error', (e: any) => {
  logger.error(`[Prisma Error] ${e.message}`);
});
