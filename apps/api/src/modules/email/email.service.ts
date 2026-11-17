import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { PgBoss } from "pg-boss";
import { z } from "zod";
import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { renderOrderEmail, renderVerificationEmail, type OrderEmailType } from "./email.templates.js";
import { createOrderTrackingToken, matchesOrderTrackingToken } from "../orders/mock-payment.js";

const queueName = "send-order-emails";
const emailTypeSchema = z.enum(["ORDER_CONFIRMATION", "PAYMENT_RECEIVED", "ORDER_SHIPPED", "ORDER_CANCELLED"]);
type EmailJobData = { logId?: string; sweep?: boolean };
type EmailDb = Prisma.TransactionClient | PrismaClient;
let boss: PgBoss | null = null;

export async function sendVerificationEmail(input: { email: string; name: string; token: string }): Promise<void> {
  const verificationUrl = `${env.API_BASE_URL.replace(/\/$/, "")}/api/v1/auth/verify-email?token=${encodeURIComponent(input.token)}`;
  const rendered = renderVerificationEmail({ name: input.name, verificationUrl });
  try {
    if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com", port: 465, secure: true,
        auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
        connectionTimeout: 15_000, greetingTimeout: 10_000, socketTimeout: 15_000,
      });
      await transport.sendMail({ from: { name: "Konyappi Shop", address: env.GMAIL_USER }, to: input.email, ...rendered });
      return;
    }
    if (!env.RESEND_API_KEY) {
      if (env.NODE_ENV !== "development") throw new HttpError(503, "Dịch vụ email xác minh chưa được cấu hình. Vui lòng thử lại sau.", "VERIFICATION_EMAIL_UNAVAILABLE");
      const transport = nodemailer.createTransport({
        host: env.MAILPIT_SMTP_HOST, port: env.MAILPIT_SMTP_PORT, secure: false,
        connectionTimeout: 5_000, greetingTimeout: 5_000, socketTimeout: 5_000,
      });
      await transport.sendMail({ from: env.EMAIL_FROM, to: input.email, ...rendered });
      logger.info("Verification email delivered to Mailpit; open http://localhost:8025 (development only)");
      return;
    }
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [input.email], subject: rendered.subject, html: rendered.html, text: rendered.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!result.ok) throw new Error(`Resend request failed with HTTP ${result.status}`);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "Chưa thể gửi email xác minh. Vui lòng thử gửi lại sau.", "VERIFICATION_EMAIL_UNAVAILABLE");
  }
}

export function hashEmailAddress(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function recordOrderEmail(db: EmailDb, orderId: string, type: OrderEmailType, email: string): Promise<string> {
  const log = await db.emailLog.create({
    data: { orderId, type, toHash: hashEmailAddress(email), status: "QUEUED" },
    select: { id: true },
  });
  return log.id;
}

export async function notifyEmailWorker(logId: string): Promise<void> {
  if (!boss) return;
  try {
    await boss.send(queueName, { logId }, { singletonKey: `email-log-${logId}`, retryLimit: 5, retryDelay: 30 });
  } catch (error) {
    logger.warn({ err: error, logId }, "Could not enqueue email log; the outbox sweep will retry");
  }
}

async function deliverEmail(logId: string): Promise<void> {
  const log = await prisma.emailLog.findUnique({
    where: { id: logId },
    include: { order: { include: { items: true, shipment: true } } },
  });
  if (!log || log.status === "SENT" || log.status === "SKIPPED") return;

  if (!env.RESEND_API_KEY) {
    await prisma.emailLog.update({ where: { id: logId }, data: { status: "SKIPPED", error: "RESEND_API_KEY is not configured" } });
    logger.info({ emailLogId: logId, type: log.type }, "Email skipped because Resend is not configured");
    return;
  }

  const type = emailTypeSchema.parse(log.type);
  await prisma.emailLog.update({ where: { id: logId }, data: { status: "SENDING", error: null } });
  try {
    const tracking = createOrderTrackingToken(log.order.id, log.order.createdAt);
    const trackingUrl = matchesOrderTrackingToken(tracking.token, log.order.trackingTokenHash)
      ? `${env.APP_BASE_URL.replace(/\/$/, "")}/orders/track?code=${encodeURIComponent(log.order.code)}#token=${encodeURIComponent(tracking.token)}`
      : null;
    const rendered = renderOrderEmail(type, { ...log.order, trackingUrl });
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": log.id,
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [log.order.email], subject: rendered.subject, html: rendered.html, text: rendered.text }),
      signal: AbortSignal.timeout(15_000),
    });
    const response = await result.json().catch(() => ({})) as { id?: unknown };
    if (!result.ok || typeof response.id !== "string") throw new Error(`Resend request failed with HTTP ${result.status}`);
    await prisma.emailLog.update({ where: { id: logId }, data: { status: "SENT", providerId: response.id, error: null } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2000) : "Unknown email delivery error";
    await prisma.emailLog.update({ where: { id: logId }, data: { status: "FAILED", error: message } });
    throw error;
  }
}

async function sweepOutbox(): Promise<void> {
  const logs = await prisma.emailLog.findMany({ where: { status: "QUEUED" }, select: { id: true }, orderBy: { createdAt: "asc" }, take: 100 });
  for (const log of logs) await notifyEmailWorker(log.id);
}

export async function startEmailWorker(pgBoss: PgBoss): Promise<void> {
  boss = pgBoss;
  await boss.createQueue(queueName, { policy: "standard" });
  await boss.work<EmailJobData>(queueName, { batchSize: 1, localConcurrency: 5 }, async (jobs) => {
    const job = jobs[0];
    if (!job) return;
    if (job.data.logId) await deliverEmail(job.data.logId);
    else await sweepOutbox();
  });
  await boss.schedule(queueName, "* * * * *", { sweep: true }, { key: "email-outbox-sweep", singletonKey: "email-outbox-sweep", missed: "once" });
  logger.info({ queueName }, "Transactional email worker started");
}
