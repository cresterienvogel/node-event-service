import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { StatsController } from './stats.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController, StatsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
