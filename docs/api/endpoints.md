# API Endpoints

## api-gateway
- `POST /auth/login`
- `GET /auth/me`
- `POST /ingestion/excel`
- `POST /webhooks/whatsapp/gupshup`
- `POST /status-sync/poll`
- `POST /sessions/:id/handoff`
- `POST /sessions/:id/resume`
- `GET /metrics/funnel`
- `GET /metrics/agent-performance`
- `GET /dashboard/sessions`
- `GET /dashboard/events`
- `GET /admin/sessions/:id/decisions`
- `GET /admin/users/:id/decisions`
- `POST /tenants/:id/knowledge/publish`

Auth:
- Dashboard/admin endpoints require `Authorization: Bearer <token>` from `/auth/login`.

## agent-runtime
- `POST /agent/respond`

## ingestion-worker
- `POST /ingestion/normalize`
- `POST /ingestion/excel`

## status-sync-worker
- `POST /status-sync/poll`

## channel-whatsapp
- `POST /webhooks/whatsapp/gupshup`
- `POST /whatsapp/send`
