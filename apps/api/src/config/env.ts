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
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_REDIRECT_URI: z.string().default(""),
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("Home & Decor <onboarding@resend.dev>"),
});

export const env = envSchema.parse(process.env);
if (env.NODE_ENV === "production" && (env.JWT_ACCESS_SECRET.startsWith("development-only") || env.JWT_ACCESS_SECRET.startsWith("replace-with-"))) {
  throw new Error("JWT_ACCESS_SECRET must be configured for production");
}
export const corsOrigins = env.API_CORS_ORIGINS.split(",").map((origin) => origin.trim());

