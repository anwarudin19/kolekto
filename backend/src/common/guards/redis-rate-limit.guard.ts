import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { CacheService } from 'src/cache/cache.service';

@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  constructor(private readonly cacheService: CacheService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path ?? request.url;

    if (!path || path.startsWith('/docs') || path.startsWith('/health')) {
      return true;
    }

    const ip = request.ip ?? 'unknown';
    const key = `rate:api:${ip}:${request.method}:${path}`;
    const hits = await this.cacheService.increment(key, 60);

    if (hits !== null && hits > 120) {
      throw new HttpException('Terlalu banyak permintaan.', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
