import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { OutboxStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly batchSize: number;
  private readonly intervalMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('delivery') private readonly deliveryQueue: Queue,
  ) {
    this.batchSize = this.config.get<number>('OUTBOX_DISPATCH_BATCH_SIZE') ?? 100;
    this.intervalMs = this.config.get<number>('OUTBOX_DISPATCH_INTERVAL_MS') ?? 2000;
  }

  @Cron('*/2 * * * * *')
  async dispatchOutbox() {
    const now = new Date();
    const items = await this.prisma.outbox.findMany({
      where: {
        status: OutboxStatus.PENDING,
        availableAt: { lte: now },
      },
      orderBy: {
        availableAt: 'asc',
      },
      take: this.batchSize,
    });

    if (items.length === 0) {
      return;
    }

    const ids = items.map((i) => i.id);
    await this.prisma.outbox.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status: OutboxStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    for (const item of items) {
      await this.deliveryQueue.add(
        'deliver',
        {
          deliveryId: item.deliveryId,
        },
        {
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      );
    }

    this.logger.log(`Dispatched ${items.length} outbox items`);
  }
}
