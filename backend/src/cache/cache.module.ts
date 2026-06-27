import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './cache.constants';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisClient');
        const client = new Redis({
          host: configService.get<string>('redis.host', 'redis'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string | undefined>('redis.password'),
          db: configService.get<number>('redis.db', 0),
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableReadyCheck: false,
        });

        client.on('error', (error) => {
          logger.warn(`Kesalahan Redis: ${error.message}`);
        });

        return client;
      },
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class CacheModule { }
