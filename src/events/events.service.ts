import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, EventStatus, DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async createEvent(dto: CreateEventDto, idempotencyKey?: string) {
    const eventKey = (idempotencyKey ?? dto.eventId)?.trim();

    if (!eventKey) {
      throw new BadRequestException('Provide Idempotency-Key header or eventId in body');
    }

    const existing = await this.prisma.event.findUnique({
      where: { eventKey },
      include: { deliveries: true },
    });

    if (existing) {
      return { eventId: existing.id, status: existing.status, deduplicated: true };
    }

    const createdAt = dto.createdAt ? new Date(dto.createdAt) : new Date();

    const payload = {
      data: dto.data,
      metadata: dto.metadata ?? null,
    };

    const subs = await this.subscriptions.findEnabledMatching(dto.type);

    const result = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          eventKey,
          type: dto.type,
          payload,
          status: EventStatus.PENDING,
          createdAt,
        },
      });

      for (const sub of subs) {
        const delivery = await tx.delivery.create({
          data: {
            eventId: event.id,
            subscriptionId: sub.id,
            status: DeliveryStatus.PENDING,
            attempts: 0,
            nextRunAt: new Date(),
          },
        });

        await tx.outbox.create({
          data: {
            deliveryId: delivery.id,
            availableAt: new Date(),
          },
        });
      }

      if (subs.length === 0) {
        await tx.event.update({
          where: { id: event.id },
          data: { status: EventStatus.DELIVERED },
        });
      }

      return event;
    });

    const status = subs.length === 0 ? EventStatus.DELIVERED : EventStatus.PENDING;
    return { eventId: result.id, status, deduplicated: false };
  }

  async getEvent(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        deliveries: {
          include: {
            subscription: true,
            logs: { orderBy: { createdAt: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getEventSummary(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { id: true, type: true, status: true, createdAt: true, updatedAt: true },
    });

    if (!event) {
      return null;
    }

    const grouped = await this.prisma.delivery.groupBy({
      by: ['status'],
      where: { eventId: id },
      _count: { status: true },
    });

    const counts: Record<string, number> = {};
    for (const g of grouped) {
      counts[g.status] = g._count.status;
    }

    const next = await this.prisma.delivery.findFirst({
      where: { eventId: id, status: { in: ['PENDING', 'FAILED'] } },
      orderBy: { nextRunAt: 'asc' },
      select: { nextRunAt: true },
    });

    return {
      ...event,
      deliveries: {
        SENT: counts['SENT'] ?? 0,
        FAILED: counts['FAILED'] ?? 0,
        DEAD: counts['DEAD'] ?? 0,
        PENDING: counts['PENDING'] ?? 0,
      },
      nextRunAt: next?.nextRunAt ? next.nextRunAt.toISOString() : null,
    };
  }

  async recomputeEventStatus(eventId: string): Promise<void> {
    const deliveries = await this.prisma.delivery.findMany({
      where: { eventId },
      select: { status: true },
    });

    if (deliveries.length === 0) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.DELIVERED },
      });
      return;
    }

    const allSent = deliveries.every((d) => d.status === DeliveryStatus.SENT);
    if (allSent) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.DELIVERED },
      });
      return;
    }

    const anyDead = deliveries.some((d) => d.status === DeliveryStatus.DEAD);
    const anySent = deliveries.some((d) => d.status === DeliveryStatus.SENT);

    if (anyDead && anySent) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.PARTIALLY_DELIVERED },
      });
      return;
    }

    const allDead = deliveries.every((d) => d.status === DeliveryStatus.DEAD);
    if (allDead) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.DEAD },
      });
      return;
    }

    await this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.PROCESSING },
    });
  }
}
