import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  readonly deliveriesSent: Counter<string>;
  readonly deliveriesFailed: Counter<string>;
  readonly deliveriesDead: Counter<string>;

  readonly deliveryDurationMs: Histogram<string>;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.deliveriesSent = new Counter({
      name: 'node_event_service_deliveries_sent_total',
      help: 'Total number of successful deliveries',
      registers: [this.registry],
    });

    this.deliveriesFailed = new Counter({
      name: 'node_event_service_deliveries_failed_total',
      help: 'Total number of retryable delivery failures',
      registers: [this.registry],
    });

    this.deliveriesDead = new Counter({
      name: 'node_event_service_deliveries_dead_total',
      help: 'Total number of permanently failed (DLQ) deliveries',
      registers: [this.registry],
    });

    this.deliveryDurationMs = new Histogram({
      name: 'node_event_service_delivery_duration_ms',
      help: 'Delivery attempt duration in milliseconds',
      buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000],
      registers: [this.registry],
    });
  }

  async metricsText(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
