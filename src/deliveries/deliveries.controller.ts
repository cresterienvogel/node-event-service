import { Controller, Get, Query, Post, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DeliveryStatus } from '@prisma/client';
import { DeliveriesService } from './deliveries.service';

@ApiTags('deliveries')
@ApiBearerAuth('apiKey')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly service: DeliveriesService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false, enum: DeliveryStatus })
  async list(@Query('status') status?: DeliveryStatus) {
    return this.service.list(status);
  }

  @Post(':id/retry')
  async retryDelivery(@Param('id') deliveryId: string) {
    return this.service.retryDelivery(deliveryId);
  }

  @Post(':id/mark-dead')
  async markDead(@Param('id') deliveryId: string) {
    return this.service.markDead(deliveryId);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') deliveryId: string) {
    return this.service.cancel(deliveryId);
  }

  @Post('/events/:id/retry')
  async retryEvent(@Param('id') eventId: string) {
    return this.service.retryEvent(eventId);
  }
}
