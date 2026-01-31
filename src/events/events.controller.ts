import { Body, Controller, Get, Headers, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

@ApiTags('events')
@ApiBearerAuth('apiKey')
@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Post()
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async create(@Body() dto: CreateEventDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.service.createEvent(dto, idempotencyKey);
  }

  @Get(':id/summary')
  async summary(@Param('id') id: string) {
    const summary = await this.service.getEventSummary(id);
    if (!summary) {
      throw new NotFoundException('Event not found');
    }
    return summary;
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const event = await this.service.getEvent(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }
}
