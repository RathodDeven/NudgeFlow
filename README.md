# NudgeFlow Loan Recovery MVP

WhatsApp-first loan reactivation monorepo built with TypeScript, pnpm workspaces, and Turborepo.

## Documentation
- Architecture overview: [`docs/architecture/overview.md`](docs/architecture/overview.md)
- Folder structure: [`docs/architecture/folder-structure.md`](docs/architecture/folder-structure.md)
- Agent skills design: [`docs/architecture/agent-skills.md`](docs/architecture/agent-skills.md)
- API endpoints: [`docs/api/endpoints.md`](docs/api/endpoints.md)
- OpenAPI spec: [`docs/api/openapi.yaml`](docs/api/openapi.yaml)
- MVP runbook: [`docs/runbooks/mvp-operations.md`](docs/runbooks/mvp-operations.md)

## Monorepo Architecture
- `apps/`: deployable services (`api-gateway`, `agent-runtime`, workers, `channel-whatsapp`, `ops-dashboard`, `n8n` assets)
- `packages/`: shared domain contracts and reusable modules (domain, compliance, persuasion, providers, observability)
- `infra/`: Docker and cloud bootstrap assets
- `docs/`: architecture, API, and runbooks
- `skills/`: runtime behavior policies and specialist prompts
- `tests/sandbox/`: sample mappings, dummy inputs, and knowledge packs

## Initialize The Repository
If you already cloned from Git, skip to setup.

If this source is copied into a new folder and not yet a repo:
```bash
git init
git add .
git commit -m "chore: initialize nudgeflow monorepo"
```

## Setup And Run
```bash
cp .env.example .env
pnpm install
pnpm db:compose:up
pnpm build
pnpm dev
```

Useful checks:
```bash
pnpm lint
pnpm format:check
pnpm typecheck
```

## Local Service Ports
- `api-gateway`: `3000` (`PORT` in `.env`)
- `agent-runtime`: `3010`
- `ingestion-worker`: `3020`
- `status-sync-worker`: `3030`
- `channel-whatsapp`: `3040`
- `ops-dashboard` (Vite): `3050`
- `n8n` (Docker): `5678`

## Environment Variables
Create `.env` from `.env.example`. Use the table below for what to set and where values come from.

| Variable | Required | Where to get it | Notes |
|---|---|---|---|
| `NODE_ENV` | Yes | Set manually | `development` for local. |
| `PORT` | Yes | Set manually | API gateway port (default `3000`). |
| `TZ` | Yes | Set manually | MVP default is `Asia/Kolkata`. |
| `DATABASE_URL` | Yes | Local Docker or managed Postgres | For local compose: `postgres://nudgeflow:nudgeflow@localhost:5432/nudgeflow`. |
| `REDIS_URL` | Yes | Local Docker or managed Redis | For local compose: `redis://localhost:6379`. |
| `OPENAI_API_KEY` | Optional but needed for live LLM replies | OpenAI dashboard | From OpenAI project/API keys. |
| `OPENAI_MODEL_ROUTINE` | Yes | Set manually | Default `gpt-4.1-mini`. |
| `OPENAI_MODEL_COMPLEX` | Yes | Set manually | Default `gpt-4.1`. |
| `SARVAM_API_KEY` | Optional but needed for provider calls | Sarvam account console | For language services if enabled. |
| `SARVAM_BASE_URL` | Yes | Sarvam docs | Default `https://api.sarvam.ai`. |
| `GUPSHUP_API_KEY` | Optional for mock, required for real WhatsApp | Gupshup app dashboard | Used by `channel-whatsapp`. |
| `GUPSHUP_APP_NAME` | Optional for mock, required for real WhatsApp | Gupshup app dashboard | WhatsApp source app name. |
| `GUPSHUP_BASE_URL` | Yes | Gupshup docs | Default `https://api.gupshup.io`. |
| `LENDER_STATUS_API_BASE_URL` | Yes | Lending partner integration team | Sandbox/staging endpoint for case status poll. |
| `LENDER_STATUS_API_KEY` | Optional in sandbox, required for real polling | Lending partner integration team | Auth key for status polling API. |
| `AGENT_SKILLS_DIR` | Yes | Set manually | Default `skills`. |
| `ADMIN_USERNAME` | Yes | Set manually | Ops dashboard login username. |
| `ADMIN_PASSWORD` | Yes | Set manually | Ops dashboard login password. |
| `DASHBOARD_AUTH_SECRET` | Yes | Generate locally or from secret manager | Use a strong random secret (for example `openssl rand -base64 32`). |
| `N8N_ENCRYPTION_KEY` | Yes when running n8n | Generate locally or from secret manager | Use strong random secret. |
| `N8N_HOST` | Yes when running n8n | Set manually | Default `localhost`. |
| `N8N_PORT` | Yes when running n8n | Set manually | Default `5678`. |

## MVP Guardrails
- Contact window is 08:00-19:00 local time.
- Max outreach attempts are 3 within 7 days.
- Messages are informational only.
- Stop outreach on blocked, opt-out, non-responsive, or human takeover.
- Dashboard data endpoints require admin auth.
