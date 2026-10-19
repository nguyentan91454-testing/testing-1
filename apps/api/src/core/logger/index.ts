import winston from 'winston';
import { config } from '../../config';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Redact PII or sensitive keys
const SENSITIVE_KEYS = ['password', 'passwordHash', 'refreshToken', 'token', 'apiKey', 'creditCard', 'secret'];

const maskSensitiveData = winston.format((info) => {
  const sanitize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);

    const copy: any = {};
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        copy[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object') {
        copy[key] = sanitize(obj[key]);
      } else {
        copy[key] = obj[key];
      }
    }
    return copy;
  };

  const sanitized = sanitize(info);
  Object.getOwnPropertySymbols(info).forEach((sym) => {
    sanitized[sym] = (info as any)[sym];
  });
  return sanitized;
});

const devLogFormat = printf(({ level, message, timestamp, requestId, stack, ...meta }) => {
  const reqId = requestId ? ` [${requestId}]` : '';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level}${reqId}: ${stack || message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    maskSensitiveData(),
    config.NODE_ENV === 'production' ? json() : combine(colorize(), devLogFormat)
  ),
  defaultMeta: { service: 'techstore-api' },
  transports: [
    new winston.transports.Console(),
  ],
});
