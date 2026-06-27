import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './cache.constants';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) { }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.warn(`Gagal mengambil cache untuk kunci ${key}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.set(key, payload, 'EX', ttlSeconds);
        return;
      }

      await this.redis.set(key, payload);
    } catch (error) {
      this.logger.warn(`Gagal menyimpan cache untuk kunci ${key}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Gagal menghapus cache untuk kunci ${key}`);
    }
  }

  async remember<T>(key: string, ttlSeconds: number, callback: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async increment(key: string, ttlSeconds: number): Promise<number | null> {
    try {
      const value = await this.redis.incr(key);
      if (value === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      return value;
    } catch (error) {
      this.logger.warn(`Gagal menambah nilai cache untuk kunci ${key}`);
      return null;
    }
  }
}
