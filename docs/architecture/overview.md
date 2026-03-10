# Architecture Overview

## Core design
- Integration entrypoints: n8n workflows.
- Stateful orchestration: TypeScript workers + BullMQ.
- Reasoning: `agent-runtime` (supervisor + specialists).
- **Tenant loading**: on startup, `agent-runtime` reads `TENANT_ID` and loads `tenants/<id>/SOUL.md`, `knowledge-base.md`, and `channel-rules.md`. All company-specific content is isolated in `tenants/`.
- Behavior policy source: `skills/*/SKILL.md` (company-agnostic framework), overridden by tenant `SOUL.md`.
- Channel adapter: `channel-whatsapp` with Gupshup package.
- Ops UI: `ops-dashboard` is React (Vite) SPA protected by API token auth.
- Data layer: Postgres (state) + Redis (queues/cache).

## Runtime flow
1. Ingestion receives rows and maps to canonical schema.
2. Scheduler creates follow-up jobs.
3. Before send, status-sync polls lender API.
4. If progressed, mark win and stop follow-up.
5. If not progressed, generate guarded response and send via WhatsApp.
6. Inbound updates memory and next scheduling decision.
7. Human handoff toggles session state and pauses agent actions.
8. Ops dashboard authenticates via `api-gateway` token endpoints before loading protected metrics/sessions/events.
