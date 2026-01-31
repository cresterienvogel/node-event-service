import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { APP_GUARD } from '@nestjs/core';

import { ApiKeyGuard } from './common/security/api-key.guard';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { EventsModule } from './events/events.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { JobsModule } from './jobs/jobs.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(3000),
        API_KEYS: Joi.string().min(1).required(),
        DATABASE_URL: Joi.string().uri().required(),
        REDIS_URL: Joi.string().uri().required(),
        DELIVERY_MAX_ATTEMPTS: Joi.number().integer().min(1).max(100).default(10),
        DELIVERY_BACKOFF_BASE_SECONDS: Joi.number().integer().min(1).max(3600).default(5),
        OUTBOX_DISPATCH_BATCH_SIZE: Joi.number().integer().min(1).max(1000).default(100),
        OUTBOX_DISPATCH_INTERVAL_MS: Joi.number().integer().min(200).max(60000).default(2000),
      }),
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    HealthModule,
    SubscriptionsModule,
    EventsModule,
    DeliveriesModule,
    JobsModule,
    MetricsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
