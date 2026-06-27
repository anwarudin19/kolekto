import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccountsModule } from './accounts/accounts.module';
import { AppController } from './app.controller';
import { AdminModule } from './admin/admin.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { AssistModule } from './assist/assist.module';
import { CacheModule } from './cache/cache.module';
import { RedisRateLimitGuard } from './common/guards/redis-rate-limit.guard';
import { envValidationSchema } from './common/utils/env.validation';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import minioConfig from './config/minio.config';
import redisConfig from './config/redis.config';
import uploadConfig from './config/upload.config';
import { DonationsModule } from './donations/donations.module';
import { InvitationsModule } from './invitations/invitations.module';
import { InvoicesModule } from './invoices/invoices.module';
import { LicensesModule } from './licenses/licenses.module';
import { MembersModule } from './members/members.module';
import { NationalHolidaysModule } from './national-holidays/national-holidays.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PlansModule } from './plans/plans.module';
import { EmailTemplateModule } from './email-template/email-template.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { RolesModule } from './roles/roles.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { TeamsModule } from './teams/teams.module';
import { TransactionCategoriesModule } from './transaction-categories/transaction-categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, minioConfig, redisConfig, uploadConfig],
      validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 120,
        },
      ],
      errorMessage: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
    }),
    PrismaModule,
    CacheModule,
    QueueModule,
    UsersModule,
    AuthModule,
    AssistModule,
    TeamsModule,
    InvitationsModule,
    MembersModule,
    RolesModule,
    PlansModule,
    LicensesModule,
    NationalHolidaysModule,
    AccountsModule,
    InvoicesModule,
    PaymentsModule,
    TransactionsModule,
    TransactionCategoriesModule,
    EmailTemplateModule,
    AdminModule,
    DonationsModule,
    NotificationsModule,
    AuditLogsModule,
    SchedulerModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RedisRateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
