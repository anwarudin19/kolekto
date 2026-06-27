import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(private readonly cacheService: CacheService) {}

  async blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
    const ttl = Math.max(expiresInSeconds, 1);
    const key = this.buildKey(token);
    await this.cacheService.set(key, { blacklisted: true }, ttl);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = this.buildKey(token);
    const result = await this.cacheService.get<{ blacklisted: boolean }>(key);
    return result?.blacklisted === true;
  }

  private buildKey(token: string): string {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    return `jwt:blacklist:${tokenHash}`;
  }
}
