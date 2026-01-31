import { Body, Controller, Get, Patch, Post, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@ApiTags('subscriptions')
@ApiBearerAuth('apiKey')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Post()
  async create(@Body() dto: CreateSubscriptionDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  async list(@Query('enabled') enabled?: string) {
    const enabledBool =
      enabled === undefined
        ? undefined
        : enabled === 'true'
          ? true
          : enabled === 'false'
            ? false
            : undefined;

    return this.service.list(enabledBool);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.service.update(id, dto);
  }
}
