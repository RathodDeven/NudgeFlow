# API Endpoints

## api-gateway
- `POST /auth/login`
- `GET /auth/me`
- `POST /ingestion/excel`
- `POST /webhooks/whatsapp/gupshup`
- `POST /webhooks/voice/bolna`
- `POST /status-sync/poll`
- `POST /sessions/:id/handoff`
- `POST /sessions/:id/resume`
- `GET /metrics/funnel`
- `GET /metrics/agent-performance`
- `GET /dashboard/sessions`
- `GET /dashboard/events`
- `GET /dashboard/sessions/:id/decisions`
- `POST /tenants/:id/knowledge/publish`
- `POST /users/upload-csv`
- `GET /users`
- `GET /users/:id`
- `GET /users/:id/messages`
- `POST /users/:id/messages`
- `GET /users/:id/session`
- `PATCH /users/:id/agent-active`
- `PATCH /users/:id/stage`
- `POST /users/:id/send-whatsapp`
- `POST /users/:id/start-conversation`
- `POST /users/:id/calls/cancel`
- `GET /users/:id/voice-status`
- `GET /users/untouched/count`
- `POST /users/batch/start-untouched`
- `GET /users/export/inferred.csv`

Auth:
- Dashboard/admin endpoints require `Authorization: Bearer <token>` from `/auth/login`.

## agent-runtime
- `POST /agent/respond`
- `POST /agent/summarize-call`

## ingestion-worker
- `POST /ingestion/normalize`
- `POST /ingestion/excel`

## status-sync-worker
- `POST /status-sync/poll`

## channel-whatsapp
- `POST /webhooks/whatsapp/gupshup`
- `POST /whatsapp/send`
