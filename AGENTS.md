# NudgeFlow Agent Context

This repository is the monorepo root for the NudgeFlow loan-reactivation MVP.

## Directory Structure

```
tenants/                       ← One folder per company deployment
  <tenant-id>/
    PROFILE.md                 ← [DEEP-GENERALIZATION] Brand metadata (name, emoji, partner)
    CHANNEL.md                 ← [DEEP-GENERALIZATION] WhatsApp templates & deep link formula
    KNOWLEDGE.md               ← [DEEP-GENERALIZATION] Tenant-specific product facts
    WORKFLOWS.md               ← [DEEP-GENERALIZATION] Tenant-specific rescue scenarios (e.g. Bill Mismatch)
    data/
      dropoffs.csv             ← User drop-off CSV for ingestion

prompts/                       ← [NEW] Centralized Global Multi-Tenant Instructions (Pure)
  IDENTITY.md                  ← Global persona, tone, and Hinglish-first rules
  WORKFLOWS.md                 ← Global nudge strategy and support reasoning
  CONSTRAINTS.md               ← Messaging limits, character caps, and single CTA rules
  SYSTEM.md                    ← Safety, governance, and escalation protocols
  KNOWLEDGE.md                 ← Universal business knowledge (MSME basics)

tests/sandbox/
  tenants/
    <tenant-id>/               ← Mirrors live tenants/, used for sandbox runs
      SOUL.md
      channel-rules.md         ← Same structure, utmCampaign = 'nudge_sandbox'
      knowledge-base.md
      data/dropoffs.csv
  mappings/                    ← Field mapping profiles for CSV normalization

[DEPRECATED] skills/           ← Legacy behavior logic (now merged into prompts/ and tenants/)

apps/                          ← Deployable services
packages/                      ← Shared, company-agnostic modules
infra/                         ← AWS bootstrap (Local Docker removed)
docs/                          ← Architecture, API, runbooks
```

## Database Management & Migrations

We use **Neon DB** for both sandbox and production. 

1. **Source of Truth**: The master schema is [`packages/db/schema/schema.sql`](./packages/db/schema/schema.sql).
2. **Migrations**: All schema changes must be recorded as a new `.sql` file in [`packages/db/migrations/`](./packages/db/migrations/).
3. **Migration Rule**: When a coding agent changes the database structure:
   - Create a new migration file (e.g., `002_add_indexing.sql`) with incremented numbering.
   - Update the master `schema.sql` to include the new changes.
   - **Notify the user** to run the new migration file in the Neon SQL Editor.
   - **Ask the user** to confirm they have updated the Neon DB before proceeding with code that depends on the new schema.

## How Tenant Loading Works

At startup, `apps/agent-runtime` loads generalized instruction modules from `prompts/` and layer-overrides from `tenants/${TENANT_ID}/`:
- **Global Purity**: `prompts/IDENTITY.md`, `WORKFLOWS.md`, `CONSTRAINTS.md`, `SYSTEM.md`, `KNOWLEDGE.md`.
- **Tenant Context**: `tenants/${TENANT_ID}/PROFILE.md`, `CHANNEL.md`, `KNOWLEDGE.md`, `WORKFLOWS.md`.

To **add a new company**, create `tenants/<id>/` with the four required markdown files and set `TENANT_ID=<id>` in `.env`. The core agent logic remains untouched in `prompts/`.

## Product Constraints (Do Not Violate)
1. WhatsApp-first MVP; voice is interface-ready only.
2. Outreach window: 08:00-19:00 local time.
3. Max outreach attempts: 3 in 7 days.
4. Informational persuasion only; no aggressive pressure or fabricated incentives.
5. Stop outreach on blocked, opt-out, non-responsive, or human takeover.
6. India-first multilingual behavior (auto-detect + Hinglish fallback).
7. Ops dashboard data endpoints must remain admin-auth protected.

## Codex Working Rules
1. Treat this folder as the monorepo root; do not create an extra nested repo folder.
2. Keep `apps/` and `packages/` company-agnostic. All company-specific values go in `tenants/<id>/`.
3. Prefer configuration and skills over hardcoded response text.
4. Add or update Zod contracts in `packages/domain` before cross-service behavior changes.
5. Keep integration logic in `apps/n8n` workflows; business decisions stay in TypeScript services.
6. Run lint/format with Biome conventions.
7. Update `AGENTS.md` whenever architecture, module boundaries, or global engineering rules change.
8. **Strict File Size & Modularity Rule**: Files should NEVER exceed ~200 lines. Extract reusable code aggressively:
   - React: `components/`, `hooks/`, `types/`, `api/`
   - Backend: `routes/`, `controllers/`, `services/`, `utils/`
9. **Database Changes**: Always follow the migration rule in the "Database Management & Migrations" section above.

## Agent Architecture & User Flow
- **Inbound Webhook Flow**: User replies on WhatsApp → `apps/api-gateway` (`/webhooks/whatsapp/gupshup`) parses Gupshup body → Maps phone number to `loanCaseId` via DB → Saves inbound message to `message_events` + `interaction_events` → POSTs chat history + call summaries to `apps/agent-runtime` (`/agent/respond`).
- **Agent Generation Flow**: `/agent/respond` → Intent Classification → Checks chat history context → **Generalized Instruction Assembly** (Global `prompts/` + Tenant `tenants/`) → LLM Generation → Outbound Guardrail.
- **Prompt Assembly**: The agent is purely instruction-driven. It merges global strategic files (IDENTITY, SYSTEM, WORKFLOWS) with tenant contextual overrides (PROFILE, CHANNEL, WORKFLOWS). 
- **Session Management**: Sessions are memory-aware. `api-gateway` sends persisted `summary_state`, `compact_facts`, a bounded recent message window, and recent call summaries from Neon DB for every request.
- **Payload & Dispatch**: The LLM natively dictates the final deeply-linked URL and CTA string as part of its strictly formulated `whatsappPayload` JSON block. `api-gateway` saves the agent decision to `agent_decisions`, updates memory, and dispatches via `apps/channel-whatsapp`.
- **Voice Calls**: `api-gateway` schedules Bolna calls directly using `scheduled_at` and tracks them in `scheduled_actions` with call subtypes (`initial`, `follow_up`, `retry`, `status_change`). Agent prompt templates live in `packages/provider-bolna`.
- **Voice Intake**: Bolna execution payloads are normalized via `@nudges/provider-bolna` before saving `interaction_events` and `call_attempts`.
- **Call Summaries**: `agent-runtime` exposes `/agent/summarize-call` to produce call summaries and optional next-call times from transcripts.

## Context Update Rule (Required)
When adding or changing any of the following, update context in the same PR/change set:
1. New service, package, queue, public endpoint, schema, env var, or external provider.
2. Any agent policy/behavior update (route rules, persuasion policy, compliance policy).
3. Any tenant addition (`tenants/<id>/`) or tenant markdown configuration change.
4. Any architectural change (service topology, ownership boundaries, auth model, deployment flow).

Required updates:
- Update `docs/architecture/overview.md` and relevant docs under `docs/api` or `docs/runbooks`.
- Update `.env.example` for new env vars.
- Update tenant `SOUL.md` when persona/behavior changes.
- Update `AGENTS.md` when the architecture or global developer rules change.

## Post-Change Quality Gate (Run After Every Code Change)
1. Run Biome checks: `pnpm lint` (or `biome check .`).
2. If Biome fails, fix with `pnpm lint:fix`, then re-run.
3. Run TypeScript checks: `pnpm typecheck`.
4. Fix TypeScript errors and re-run until clean.
5. Report clearly when checks cannot run due to environment limits.

## Skill Loading Contract
- `apps/agent-runtime` loads prompts from `prompts/*.md` at runtime.
- Tenant `PROFILE.md` specifies brand identity (Neha, ClickPe, etc.).
- Global `WORKFLOWS.md` defines general reasoning; Tenant `WORKFLOWS.md` defines specific rescue flows (Bill Mismatch).
- Global `SYSTEM.md` handles compliance, scope control, and escalation.
- Global `CONSTRAINTS.md` + Tenant `CHANNEL.md` define the output format and hard limits.
