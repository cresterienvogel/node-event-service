import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'user.created' })
  @IsString()
  type!: string;

  @ApiProperty({
    example: 'client-event-id-123',
    required: false,
    description: 'Idempotency key alternative',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty({ example: '2026-01-31T12:00:00.000Z', required: false })
  @IsOptional()
  @IsISO8601()
  createdAt?: string;

  @ApiProperty({ example: { userId: '123' } })
  @IsObject()
  data!: Record<string, any>;

  @ApiProperty({ required: false, example: { traceId: 'abc' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
