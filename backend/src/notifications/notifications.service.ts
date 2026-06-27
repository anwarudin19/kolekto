import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CACHE_TTL, cacheKeys } from 'src/queue/queue.constants';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) { }

  async listForUser(userId: string, options?: { page?: number; limit?: number; isRead?: boolean }) {
    const page = Math.max(options?.page ?? 1, 1);
    const limit = Math.min(Math.max(options?.limit ?? 15, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = { userId };
    if (options?.isRead !== undefined) {
      where.isRead = options.isRead;
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  create(data: Prisma.NotificationUncheckedCreateInput) {
    return this.prisma.notification.create({ data });
  }

  async getUnreadCount(userId: string) {
    return this.cacheService.remember(
      cacheKeys.unreadNotificationCount(userId),
      CACHE_TTL.UNREAD_NOTIFICATION_COUNT,
      async () => {
        const total = await this.prisma.notification.count({
          where: {
            userId,
            isRead: false,
          },
        });

        return { total };
      },
    );
  }

  async markAsRead(userId: string, notificationId: string, dto: MarkNotificationReadDto) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Anda hanya dapat mengubah notifikasi milik sendiri');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: dto.isRead ?? true,
      },
    });

    await this.cacheService.del(cacheKeys.unreadNotificationCount(userId));
    return updated;
  }
}
