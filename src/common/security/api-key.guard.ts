import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyAuthService } from './api-key-auth.service';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly auth: ApiKeyAuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request & { headers: any }>();
    const apiKey = req.headers['x-api-key'] as string | undefined;

    if (!this.auth.isValid(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
