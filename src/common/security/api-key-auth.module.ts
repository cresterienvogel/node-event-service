import { Module } from '@nestjs/common';
import { ApiKeyAuthService } from './api-key-auth.service';

@Module({
  providers: [ApiKeyAuthService],
  exports: [ApiKeyAuthService],
})
export class ApiKeyAuthModule {}
