# 📦 Node Event Service

<p>
  <img src="https://img.shields.io/badge/NestJS-10-red?&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-7-red?&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-ORM-brightgreen?&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Ready-blue?&logo=docker&logoColor=white" />
</p>

---

## 📌 Overview

**Node Event Service** is a backend service for **reliable event delivery via HTTP webhooks**.

It acts as an **event relay layer** between producer services (payments, auth, game servers, etc.) and consumer services (backends, bots, CRMs, game servers, analytics systems).

The service focuses on:
- Accepting events from trusted producers
- Persisting events safely
- Delivering them to subscribed HTTP endpoints
- Retrying on failures with backoff
- Providing full delivery transparency and control

No UI. No sessions.  
Only a clean, explicit **event-driven HTTP API**.

---

## 📎 Use cases

- Payment systems → game servers (donations)
- Auth services → user profile services
- CRMs → analytics pipelines
- Game servers → external backends
- Any system requiring **reliable HTTP event delivery**

---

## ✨ Features

| Feature | Description |
|------|------------|
| Event ingestion | Accept events via HTTP API |
| Subscriptions | Subscribe endpoints to event types |
| Webhook delivery | HTTP POST callbacks to external services |
| Retries & backoff | Automatic retry with exponential backoff |
| Dead-letter queue | Failed deliveries are marked as DEAD |
| Manual retry | Retry failed deliveries or whole events |
| Idempotency | Safe re-sends using `Idempotency-Key` |
| Partial delivery | Track mixed success/failure per event |
| Delivery logs | Full attempt history with timing & errors |
| Metrics | Prometheus-compatible `/metrics` endpoint |
| Docker-ready | One-command local or server deployment |

---

## 🧰 Tech Stack

| Component | Tech |
|---------|------|
| API | NestJS 10 |
| Database | PostgreSQL 16 |
| Queue / Locks | Redis 7 |
| ORM | Prisma |
| Migrations | Prisma Migrate |
| Runtime | Node.js 20 |
| Deployment | Docker & Docker Compose |


---

## 🧠 Architecture Highlights

### Event lifecycle

```
Producer service
  ↓
POST /v1/events
  ↓
Database (event + outbox)
  ↓
Dispatcher job
  ↓
Subscriptions lookup
  ↓
HTTP delivery attempts
  ↓
SENT / FAILED / DEAD
```

### Key design decisions

- Events are **persisted before delivery**
- Delivery happens **asynchronously** via background jobs
- Each subscription is isolated (failures don’t block others)
- Retries use **exponential backoff**
- Final failures go to **DLQ (DEAD)**
- Full observability via logs, stats and metrics

---

## 🔐 Authentication

All protected endpoints require:

```
X-API-Key: <API_KEY>
```

API keys are **service-level credentials**, not user sessions.

Configured via:

```env
API_KEYS=key-1,key-2
```

---

## 🗺️ API Endpoints

### Health & system
- `GET /v1/health` — service, DB and Redis health
- `GET /v1/stats` — aggregated service statistics
- `GET /v1/metrics` — Prometheus metrics

### Subscriptions
- `POST /v1/subscriptions` — create subscription
- `GET /v1/subscriptions` — list subscriptions
- `PATCH /v1/subscriptions/{id}` — enable / disable

### Events
- `POST /v1/events` — publish event
- `GET /v1/events/{id}` — get event with deliveries
- `GET /v1/events/{id}/summary` — compact delivery summary

### Deliveries
- `GET /v1/deliveries` — list deliveries
- `POST /v1/deliveries/{id}/retry` — retry single delivery
- `POST /v1/deliveries/events/{eventId}/retry` — retry all failed deliveries for event

---

## 🔁 Event payload format

### Event creation

```json
{
  "type": "user.created",
  "data": {
    "userId": "u_123"
  },
  "metadata": {
    "source": "auth-service"
  }
}
```

### Delivered webhook payload

```json
{
  "id": "event-uuid",
  "type": "user.created",
  "createdAt": "2026-01-31T18:20:43.400Z",
  "payload": {
    "data": { "userId": "u_123" },
    "metadata": { "source": "auth-service" }
  }
}
```

---

## 🧪 Quick tests

### Create subscription
```bash
curl -X POST http://localhost:3000/v1/subscriptions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-1" \
  -d '{"endpointUrl":"https://example.com/webhook","eventTypes":["user.created"],"secret":"my-secret"}'
```

### Publish event
```bash
curl -X POST http://localhost:3000/v1/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-1" \
  -H "Idempotency-Key: test-1" \
  -d '{"type":"user.created","data":{"userId":"u_1"}}'
```

### Retry failed deliveries
```bash
curl -X POST http://localhost:3000/v1/deliveries/events/EVENT_ID/retry \
  -H "X-API-Key: dev-key-1"
```

---

## 🚀 Quick Start

### 1. Clone repository
```bash
git clone https://github.com/cresterienvogel/node-event-service.git
cd node-event-service
```

### 2. Create `.env`
```bash
cp .env.example .env
```

### 3. Run with Docker
```bash
docker compose up --build
```

Service will be available at:
```
http://localhost:3000
```
