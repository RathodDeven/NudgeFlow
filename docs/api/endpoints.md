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
- `GET /users/export/bolna-batch.csv`

Notes:
- `GET /users/export/inferred.csv` returns admin analytics export built from DB + inferred call snapshot fields.
- `GET /users/export/bolna-batch.csv` returns a Bolna batch-upload CSV with `contact_number` and prompt variable columns matching `bolnaAgentVariables`.

Auth:
- Dashboard/admin endpoints require `Authorization: Bearer <token>` from `/auth/login`.

## agent-runtime
- `POST /agent/respond`
- `POST /agent/summarize-call`

Notes:
- `/agent/summarize-call` remains available but is currently not used by the Bolna voice webhook flow.

## ingestion-worker
- `POST /ingestion/normalize`
- `POST /ingestion/excel`

## status-sync-worker
- `POST /status-sync/poll`

## channel-whatsapp
- `POST /webhooks/whatsapp/gupshup`
- `POST /whatsapp/send`
