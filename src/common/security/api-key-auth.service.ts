import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyAuthService {
  private readonly keys: Set<string>;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.getOrThrow<string>('API_KEYS');

    this.keys = new Set(
      raw
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0),
    );
  }

  isValid(apiKey: string | undefined): boolean {
    if (!apiKey) {
      return false;
    }
    return this.keys.has(apiKey);
  }
}
