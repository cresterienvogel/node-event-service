import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createHmac } from 'crypto';
import { DeliveryStatus } from '@prisma/client';
import { exponentialBackoffSeconds } from '../../common/utils/backoff';
import { addSeconds } from '../../common/utils/time';
import { EventsService } from '../../events/events.service';
import { MetricsService } from '../../metrics/metrics.service';

type DeliverJob = { deliveryId: string };

@Processor('delivery')
export class DeliveryProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventsService,
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  async process(job: Job<DeliverJob>) {
    const { deliveryId } = job.data;

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { event: true, subscription: true },
    });

    if (!delivery) {
      return;
    }

    if (delivery.status === DeliveryStatus.SENT || delivery.status === DeliveryStatus.DEAD) {
      return;
    }

    if (delivery.nextRunAt && delivery.nextRunAt.getTime() > Date.now()) {
      await this.prisma.outbox.create({
        data: { deliveryId: delivery.id, availableAt: delivery.nextRunAt },
      });
      return;
    }

    const maxAttempts = this.config.get<number>('DELIVERY_MAX_ATTEMPTS') ?? 10;
    const baseSeconds = this.config.get<number>('DELIVERY_BACKOFF_BASE_SECONDS') ?? 5;

    const attemptNumber = delivery.attempts + 1;

    const body = {
      type: delivery.event.type,
      eventId: delivery.event.id,
      createdAt: delivery.event.createdAt.toISOString(),
      data: (delivery.event.payload as any).data,
      metadata: (delivery.event.payload as any).metadata,
    };

    const bodyText = JSON.stringify(body);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Event-Id': delivery.event.id,
      'X-Event-Type': delivery.event.type,
      'X-Event-Version': '1',
    };

    if (delivery.subscription.secret) {
      const sig = createHmac('sha256', delivery.subscription.secret).update(bodyText).digest('hex');
      headers['X-Signature'] = `sha256=${sig}`;
    }

    let statusCode: number | null = null;
    let errorText: string | null = null;

    const startedAt = Date.now();

    try {
      const res = await fetch(delivery.subscription.endpointUrl, {
        method: 'POST',
        headers,
        body: bodyText,
      });

      statusCode = res.status;

      const durationMs = Date.now() - startedAt;

      if (res.ok) {
        await this.prisma.$transaction(async (tx) => {
          await tx.delivery.update({
            where: { id: delivery.id },
            data: {
              status: DeliveryStatus.SENT,
              attempts: attemptNumber,
              lastError: null,
              lastStatusCode: statusCode,
            },
          });

          await tx.deliveryLog.create({
            data: {
              deliveryId: delivery.id,
              attempt: attemptNumber,
              status: DeliveryStatus.SENT,
              statusCode,
              error: null,
              responseTimeMs: durationMs,
            },
          });
        });

        this.metrics.deliveriesSent.inc(1);
        this.metrics.deliveryDurationMs.observe(durationMs);

        await this.events.recomputeEventStatus(delivery.eventId);
        return;
      }

      errorText = `Non-2xx response: ${res.status}`;

      const isPermanent4xx =
        res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429;

      if (isPermanent4xx) {
        await this.prisma.$transaction(async (tx) => {
          await tx.delivery.update({
            where: { id: delivery.id },
            data: {
              status: DeliveryStatus.DEAD,
              attempts: attemptNumber,
              lastError: errorText,
              lastStatusCode: statusCode,
            },
          });

          await tx.deliveryLog.create({
            data: {
              deliveryId: delivery.id,
              attempt: attemptNumber,
              status: DeliveryStatus.DEAD,
              statusCode,
              error: errorText,
              responseTimeMs: durationMs,
            },
          });
        });

        this.metrics.deliveriesDead.inc(1);
        this.metrics.deliveryDurationMs.observe(durationMs);

        await this.events.recomputeEventStatus(delivery.eventId);
        return;
      }
    } catch (e: any) {
      errorText = e?.message ? String(e.message) : 'Request failed';
    }

    const durationMs = Date.now() - startedAt;

    const isLastAttempt = attemptNumber >= maxAttempts;
    const nextStatus = isLastAttempt ? DeliveryStatus.DEAD : DeliveryStatus.FAILED;
    const nextRunAt = isLastAttempt
      ? null
      : addSeconds(new Date(), exponentialBackoffSeconds(attemptNumber, baseSeconds));

    await this.prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: nextStatus,
          attempts: attemptNumber,
          nextRunAt: nextRunAt ?? delivery.nextRunAt,
          lastError: errorText,
          lastStatusCode: statusCode ?? undefined,
        },
      });

      await tx.deliveryLog.create({
        data: {
          deliveryId: delivery.id,
          attempt: attemptNumber,
          status: nextStatus,
          statusCode: statusCode ?? undefined,
          error: errorText,
          responseTimeMs: durationMs,
        },
      });

      if (!isLastAttempt && nextRunAt) {
        await tx.outbox.create({
          data: { deliveryId: delivery.id, availableAt: nextRunAt },
        });
      }
    });

    if (nextStatus === DeliveryStatus.DEAD) {
      this.metrics.deliveriesDead.inc(1);
    } else {
      this.metrics.deliveriesFailed.inc(1);
    }
    this.metrics.deliveryDurationMs.observe(durationMs);

    await this.events.recomputeEventStatus(delivery.eventId);
  }
}
