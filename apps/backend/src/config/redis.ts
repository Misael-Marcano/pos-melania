import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 2000),
  lazyConnect: true,
});

redis.on('connect', () => console.log('✅ Redis conectado'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));

export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  },
  set: async (key: string, value: unknown, ttlSeconds = 300): Promise<void> => {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  },
  del: async (key: string): Promise<void> => {
    await redis.del(key);
  },
  delPattern: async (pattern: string): Promise<void> => {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  },
};
