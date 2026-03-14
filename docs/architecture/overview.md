# Architecture Overview

## Core design
- Integration entrypoints: n8n workflows.
- Stateful orchestration: TypeScript workers + BullMQ.
- Reasoning: `agent-runtime` (supervisor + specialists).
- **Tenant loading**: on startup, `agent-runtime` reads `TENANT_ID` and loads `tenants/<id>/SOUL.md`, `knowledge-base.md`, and `channel-rules.md`. All company-specific content is isolated in `tenants/`.
- Behavior policy source: `skills/*/SKILL.md` (company-agnostic framework), overridden by tenant `SOUL.md`.
- Channel adapter: `channel-whatsapp` with Gupshup package. Voice webhook parsing lives in `@nudges/provider-bolna`.
- Tenant WhatsApp template dispatch config for `api-gateway` is loaded from `tenants/<id>/whatsapp-template.config.ts`.
- Ops UI: `ops-dashboard` is React (Vite) SPA protected by API token auth.
- Data layer: Postgres (state + decisions + interaction events + scheduled actions + policy events) + Redis (queues/cache).

## Runtime flow
1. Ingestion receives rows and maps to canonical schema.
2. Scheduler creates follow-up jobs as `scheduled_actions` (e.g., `whatsapp_followup`); voice calls are scheduled directly via Bolna `scheduled_at` and tracked in `scheduled_actions`.
3. Worker recovery loop claims overdue actions and enqueues BullMQ jobs idempotently for WhatsApp follow-ups.
4. Policy module evaluates outreach windows, attempt caps, cooldowns, and stop conditions before dispatch.
5. Before send, status-sync polls lender API.
6. If progressed, mark win and stop follow-up.
7. If not progressed, generate guarded response and send via WhatsApp.
8. Inbound updates memory plus `interaction_events`, and agent decisions are persisted before outbound dispatch.
9. Human handoff toggles session state and pauses agent actions.
10. Ops dashboard authenticates via `api-gateway` token endpoints before loading protected metrics/sessions/events/decisions.
11. Dashboard can start outreach in batch for untouched users; untouched means no outbound WhatsApp events and no call attempts.
12. Bolna webhook data updates interaction history and latest call inference snapshot on `loan_cases` (intent/disposition/follow-up/summary/extractions) for filtering and CSV export. Call summaries are sourced directly from Bolna webhook payload fields.

- CSV exports are split by purpose: inferred analytics export for admin action (`/users/export/inferred.csv`) and Bolna batch-upload export (`/users/export/bolna-batch.csv`) with `contact_number` + dynamic variables aligned to `@nudges/provider-bolna`.

- Session memory uses persisted summary + compact facts with a bounded recent message window, plus call summaries (not raw transcripts) from interaction events.
