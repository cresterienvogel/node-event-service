import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, OutboxStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(status?: DeliveryStatus) {
    return this.prisma.delivery.findMany({
      where: status ? { status } : undefined,
      include: {
        event: true,
        subscription: true,
        logs: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async retryEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const deliveries = await this.prisma.delivery.findMany({
      where: { eventId, status: DeliveryStatus.DEAD },
    });

    if (deliveries.length === 0) {
      throw new BadRequestException('No DEAD deliveries to retry');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const d of deliveries) {
        await tx.delivery.update({
          where: { id: d.id },
          data: {
            status: DeliveryStatus.PENDING,
            attempts: 0,
            nextRunAt: new Date(),
            lastError: null,
            lastStatusCode: null,
          },
        });

        await tx.outbox.create({
          data: {
            deliveryId: d.id,
            availableAt: new Date(),
            status: OutboxStatus.PENDING,
          },
        });
      }
    });

    return { retried: deliveries.length };
  }

  async retryDelivery(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.status !== DeliveryStatus.DEAD && delivery.status !== DeliveryStatus.FAILED) {
      throw new BadRequestException('Only DEAD or FAILED deliveries can be retried');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.PENDING,
          attempts: 0,
          nextRunAt: new Date(),
          lastError: null,
          lastStatusCode: null,
        },
      });

      await tx.outbox.create({
        data: {
          deliveryId: delivery.id,
          availableAt: new Date(),
          status: OutboxStatus.PENDING,
        },
      });
    });

    return { retried: 1 };
  }

  async markDead(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    await this.prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.DEAD,
        lastError: 'Manually marked DEAD',
      },
    });

    return { updated: true };
  }

  async cancel(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    await this.prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.DEAD,
        lastError: 'Cancelled',
      },
    });

    return { cancelled: true };
  }
}
