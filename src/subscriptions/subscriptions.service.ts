import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubscriptionDto) {
    const existing = await this.prisma.subscription.findFirst({
      where: {
        endpointUrl: dto.endpointUrl,
        eventTypes: { equals: dto.eventTypes },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      throw new ConflictException(
        'Subscription already exists for the same endpointUrl and eventTypes',
      );
    }

    return this.prisma.subscription.create({
      data: {
        endpointUrl: dto.endpointUrl,
        secret: dto.secret ?? null,
        eventTypes: dto.eventTypes,
        isEnabled: true,
      },
    });
  }

  async list(enabled?: boolean) {
    return this.prisma.subscription.findMany({
      where: enabled === undefined ? undefined : { isEnabled: enabled },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const item = await this.prisma.subscription.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Subscription not found');
    }
    return item;
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.get(id);

    return this.prisma.subscription.update({
      where: { id },
      data: {
        endpointUrl: dto.endpointUrl,
        secret: dto.secret,
        eventTypes: dto.eventTypes,
        isEnabled: dto.isEnabled,
      },
    });
  }

  async findEnabledMatching(eventType: string) {
    return this.prisma.subscription.findMany({
      where: {
        isEnabled: true,
        eventTypes: { has: eventType },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
