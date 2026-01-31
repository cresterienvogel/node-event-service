import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('stats')
@ApiBearerAuth('apiKey')
@Controller('stats')
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async stats() {
    const [eventsTotal, deliveriesTotal, deliveriesSent, deliveriesFailed, deliveriesDead] =
      await Promise.all([
        this.prisma.event.count(),
        this.prisma.delivery.count(),
        this.prisma.delivery.count({ where: { status: 'SENT' } }),
        this.prisma.delivery.count({ where: { status: 'FAILED' } }),
        this.prisma.delivery.count({ where: { status: 'DEAD' } }),
      ]);

    return {
      eventsTotal,
      deliveriesTotal,
      deliveriesSent,
      deliveriesFailed,
      deliveriesDead,
    };
  }
}
