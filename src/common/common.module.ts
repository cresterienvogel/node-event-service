import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ApiKeyAuthModule } from './security/api-key-auth.module';

@Global()
@Module({
  imports: [PrismaModule, ApiKeyAuthModule],
  exports: [PrismaModule, ApiKeyAuthModule],
})
export class CommonModule {}
