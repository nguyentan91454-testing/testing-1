import Redis from 'ioredis';
import { config } from '../../config';
import { logger } from '../logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private isRedisConnected = false;

  constructor() {
    if (config.REDIS_ENABLED) {
      try {
        this.redis = new Redis(config.REDIS_URL, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null, // Don't loop reconnection if redis is down
        });

        this.redis
          .connect()
          .then(() => {
            this.isRedisConnected = true;
            logger.info('🚀 Connected to Redis cache service.');
          })
          .catch((err) => {
            this.isRedisConnected = false;
            logger.warn('⚠️ Redis not reachable, falling back to High-Speed In-Memory Cache.');
          });
      } catch {
        this.isRedisConnected = false;
      }
    } else {
      logger.info('ℹ️ Using In-Memory Cache Service (Redis disabled in config).');
    }

    // Cleanup expired in-memory cache periodically (every 5 minutes)
    setInterval(() => this.cleanupMemoryCache(), 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisConnected && this.redis) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      }
    } catch (err) {
      logger.warn(`Redis get error for key ${key}, checking memory fallback`);
    }

    // In-memory fallback
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      }
    } catch (err) {
      logger.warn(`Redis set error for key ${key}, saving to memory fallback`);
    }

    // In-memory fallback
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.del(key);
      }
    } catch {}

    this.memoryCache.delete(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch {}

    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService();
