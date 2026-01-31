import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl, ArrayNotEmpty } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ example: 'https://example.com/webhook' })
  @IsUrl({ require_tld: false })
  endpointUrl!: string;

  @ApiProperty({ example: 'super-secret', required: false })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({ example: ['user.created', 'order.paid'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  eventTypes!: string[];
}
