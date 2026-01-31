import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { DeliveryProcessor } from './processors/delivery.processor';
import { EventsModule } from '../events/events.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    EventsModule,
    MetricsModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        return { connection: { url: redisUrl } };
      },
    }),
    BullModule.registerQueue({ name: 'delivery' }),
  ],
  providers: [JobsService, DeliveryProcessor],
  exports: [JobsService],
})
export class JobsModule {}
