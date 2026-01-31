import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_tld: false })
  endpointUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  secret?: string | null;

  @ApiProperty({ required: false, example: ['user.created'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];
}
