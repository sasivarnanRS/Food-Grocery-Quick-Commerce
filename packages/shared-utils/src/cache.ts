import Redis from 'ioredis';
import { Logger } from './logger';

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRatio: number;
  keysCount: number;
  mode: 'REDIS' | 'IN_MEMORY_FALLBACK';
}

interface InMemoryItem {
  value: string;
  expiresAt: number;
}

export class CacheService {
  private redis: Redis | null = null;
  private inMemoryStore = new Map<string, InMemoryItem>();
  private hits = 0;
  private misses = 0;
  private isConnectedToRedis = false;
  private logger: Logger;

  constructor(serviceName: string) {
    this.logger = new Logger(`${serviceName}:Cache`);
    this.initRedis();
  }

  private initRedis(): void {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            return null; // Stop reconnecting and remain in fallback
          }
          return Math.min(times * 200, 1000);
        },
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      this.redis.connect().then(() => {
        this.isConnectedToRedis = true;
        this.logger.info('Connected to Redis server successfully');
      }).catch((err) => {
        this.isConnectedToRedis = false;
        this.logger.warn(`Redis unavailable (${err.message}). Using high-performance in-memory fallback.`);
      });

      this.redis.on('error', (err) => {
        if (this.isConnectedToRedis) {
          this.logger.warn(`Redis error: ${err.message}. Seamlessly serving via in-memory cache.`);
          this.isConnectedToRedis = false;
        }
      });

      this.redis.on('connect', () => {
        this.isConnectedToRedis = true;
        this.logger.info('Redis connection restored.');
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.isConnectedToRedis = false;
      this.logger.warn(`Redis init error: ${msg}. Fallback active.`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isConnectedToRedis && this.redis) {
        const raw = await this.redis.get(key);
        if (raw !== null) {
          this.hits++;
          return JSON.parse(raw) as T;
        }
      } else {
        const item = this.inMemoryStore.get(key);
        if (item) {
          if (item.expiresAt > Date.now()) {
            this.hits++;
            return JSON.parse(item.value) as T;
          }
          this.inMemoryStore.delete(key);
        }
      }
    } catch (err) {
      this.logger.warn(`Cache get failed for key "${key}": ${(err as Error).message}`);
    }

    this.misses++;
    return null;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      const stringified = JSON.stringify(value);
      if (this.isConnectedToRedis && this.redis) {
        await this.redis.set(key, stringified, 'EX', ttlSeconds);
      } else {
        this.inMemoryStore.set(key, {
          value: stringified,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
      }
    } catch (err) {
      this.logger.warn(`Cache set failed for key "${key}": ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.isConnectedToRedis && this.redis) {
        await this.redis.del(key);
      }
      this.inMemoryStore.delete(key);
    } catch (err) {
      this.logger.warn(`Cache del failed for key "${key}": ${(err as Error).message}`);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      // Clean in-memory
      const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const k of this.inMemoryStore.keys()) {
        if (regexPattern.test(k)) {
          this.inMemoryStore.delete(k);
        }
      }

      // Clean Redis
      if (this.isConnectedToRedis && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (err) {
      this.logger.warn(`Cache delPattern failed for "${pattern}": ${(err as Error).message}`);
    }
  }

  async flush(): Promise<void> {
    this.inMemoryStore.clear();
    if (this.isConnectedToRedis && this.redis) {
      await this.redis.flushdb();
    }
  }

  getMetrics(): CacheMetrics {
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? Number((this.hits / total).toFixed(4)) : 0;
    
    // Purge expired in-memory items count
    const now = Date.now();
    for (const [k, v] of this.inMemoryStore.entries()) {
      if (v.expiresAt <= now) {
        this.inMemoryStore.delete(k);
      }
    }

    return {
      hits: this.hits,
      misses: this.misses,
      hitRatio,
      keysCount: this.inMemoryStore.size,
      mode: this.isConnectedToRedis ? 'REDIS' : 'IN_MEMORY_FALLBACK',
    };
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => {});
    }
  }
}
