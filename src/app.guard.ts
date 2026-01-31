import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './common/security/api-key.guard';

export const AppGuardProvider = {
  provide: APP_GUARD,
  useClass: ApiKeyGuard,
};
