import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/security/public.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  async health() {
    const db = await this.prisma.$queryRaw`SELECT 1 as ok`;
    const redisUrl = this.config.get<string>('REDIS_URL');

    const client = createClient({ url: redisUrl });
    await client.connect();

    const pong = await client.ping();
    await client.disconnect();

    return { status: 'ok', db, redis: pong };
  }
}
