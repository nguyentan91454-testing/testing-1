import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_CORS_ORIGINS: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32).default("development-only-change-this-secret-32chars"),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().default("admin@example.test"),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).default("change-me-before-use"),
  AI_PROVIDER: z.enum(["mock", "gemini"]).default("mock"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  ALLOW_MOCK_PAYMENTS: z.enum(["true", "false"]).default("false"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  FIREBASE_PROJECT_ID: z.string().regex(/^[a-z0-9-]{6,30}$/).or(z.literal("")).default(""),
  RESEND_API_KEY: z.string().default(""),
  GMAIL_USER: z.union([z.literal(""), z.string().email()]).default(""),
  GMAIL_APP_PASSWORD: z.string().default("").transform((value) => value.replace(/\s/g, "")),
  MAILPIT_SMTP_HOST: z.string().min(1).default("127.0.0.1"),
  MAILPIT_SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  EMAIL_FROM: z.string().default("Home & Decor <onboarding@resend.dev>"),
}).refine((value) => Boolean(value.GMAIL_USER) === Boolean(value.GMAIL_APP_PASSWORD), {
  message: "Cần cấu hình cả GMAIL_USER và GMAIL_APP_PASSWORD để gửi thư qua Gmail.",
  path: ["GMAIL_USER"],
});

export const env = envSchema.parse(process.env);
if (env.NODE_ENV === "production") {
  const invalidProductionSettings = [
    env.JWT_ACCESS_SECRET.startsWith("development-only") || env.JWT_ACCESS_SECRET.startsWith("replace-with-") ? "JWT_ACCESS_SECRET" : null,
    env.ADMIN_BOOTSTRAP_PASSWORD === "change-me-before-use" ? "ADMIN_BOOTSTRAP_PASSWORD" : null,
    env.APP_BASE_URL.startsWith("https://") ? null : "APP_BASE_URL must use HTTPS",
    env.API_BASE_URL.startsWith("https://") ? null : "API_BASE_URL must use HTTPS",
    env.API_CORS_ORIGINS.split(",").some((origin) => origin.trim().startsWith("http://localhost")) ? "API_CORS_ORIGINS" : null,
    env.RESEND_API_KEY || env.GMAIL_USER ? null : "RESEND_API_KEY or Gmail SMTP",
  ].filter((value): value is string => value !== null);
  if (invalidProductionSettings.length > 0) throw new Error(`Production environment is not configured: ${invalidProductionSettings.join(", ")}`);
}
export const corsOrigins = env.API_CORS_ORIGINS.split(",").map((origin) => origin.trim());

