import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from workspace root or current directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_URL: z.string().default('http://localhost:5000'),
  WEB_URL: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().default('file:./dev.db'),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_ENABLED: z.enum(['true', 'false']).transform((v) => v === 'true').default('false'),

  JWT_ACCESS_SECRET: z.string().default('dev-jwt-access-token-secret-key-32charsmin-xyz'),
  JWT_REFRESH_SECRET: z.string().default('dev-jwt-refresh-token-secret-key-32charsmin-xyz'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  COOKIE_SECRET: z.string().default('cookie-signing-secret-key-development'),
  COOKIE_SECURE: z.enum(['true', 'false']).transform((v) => v === 'true').default('false'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  AI_PROVIDER: z.enum(['gemini', 'openai', 'anthropic']).default('gemini'),
  AI_API_KEY: z.string().default(''),
  AI_MODEL: z.string().default('gemini-2.0-flash'),
  AI_TEMPERATURE: z.coerce.number().default(0.2),

  MOCK_PAYMENT_ENABLED: z.enum(['true', 'false']).transform((v) => v === 'true').default('true'),

  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),
  AI_RATE_LIMIT_MAX: z.coerce.number().default(20),
});

export type Config = z.infer<typeof EnvSchema>;

function loadConfig(): Config {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    return EnvSchema.parse({});
  }
  return result.data;
}

export const config = loadConfig();
