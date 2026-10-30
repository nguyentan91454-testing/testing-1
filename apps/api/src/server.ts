import type { Server } from "node:http";
import type { PgBoss } from "pg-boss";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { startReservationWorker } from "./modules/orders/reservation-worker.js";
import { startEmailWorker } from "./modules/email/email.service.js";

async function start() {
  const boss: PgBoss = await startReservationWorker();
  try {
    await startEmailWorker(boss);
  } catch (error) {
    await boss.stop();
    throw error;
  }
  const server: Server = app.listen(env.API_PORT, () => {
    logger.info({ port: env.API_PORT }, "API server started");
  });
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down API");
    server.close(async () => {
      await boss.stop();
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void start().catch(async (error: unknown) => {
  logger.error({ err: error }, "Unable to start API and reservation worker");
  await prisma.$disconnect();
  process.exitCode = 1;
});
