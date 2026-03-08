# NudgeFlow Loan Recovery MVP

All-TypeScript monorepo (root-level) for WhatsApp-first loan reactivation with modular architecture for voice/API expansion.

## What is implemented
- `pnpm` workspaces + Turborepo setup.
- Modular apps for ingestion, scheduling, status sync, agent runtime, WhatsApp channel, API gateway, and ops dashboard.
- Shared packages for domain contracts, safety/compliance, persuasion, session memory compaction, provider adapters, and observability.
- Biome-based linting and formatting.
- Skill-driven runtime behavior in `skills/*/SKILL.md`.
- React + Vite ops dashboard with admin login gate.
- n8n workflow assets for integration triggers.
- Docker Compose for Postgres, Redis, and n8n.
- Sandbox data/mappings and basic tests.

## Quick start
```bash
cp .env.example .env
pnpm install
pnpm build
pnpm dev
```

## Services (default local ports)
- `api-gateway`: `3000`
- `agent-runtime`: `3010`
- `ingestion-worker`: `3020`
- `status-sync-worker`: `3030`
- `channel-whatsapp`: `3040`
- `ops-dashboard` (React/Vite): `3050`
- `n8n`: `5678` (via Docker)

## MVP guardrails
- Contact window: 08:00-19:00 local time.
- Follow-up cap: 3 attempts in 7 days.
- Informational nudges only.
- Stop outreach on `blocked`, `opt-out`, `non-responsive`, and `human_takeover`.
- Dashboard endpoints require admin authentication token from `POST /auth/login`.

## API keys required
- OpenAI (`OPENAI_API_KEY`)
- Sarvam (`SARVAM_API_KEY`)
- Gupshup (`GUPSHUP_API_KEY`, `GUPSHUP_APP_NAME`)
- Lender status API (`LENDER_STATUS_API_KEY`)

## Important notes
- Consent is currently partner-asserted (`partner_claim`) and should be upgraded to explicit evidence.
- Persistence layer in app code is scaffold-level; wire real repositories (Postgres) for production.
- Voice channel is architecture-ready but not enabled in MVP runtime.
