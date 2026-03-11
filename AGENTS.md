# NudgeFlow Agent Context

This repository is the monorepo root for the NudgeFlow loan-reactivation MVP.

## Directory Structure

```
tenants/                       ← One folder per company deployment
  <tenant-id>/
    SOUL.md                    ← Agent persona, tone, identity, boundaries
    channel-rules.md           ← WhatsApp CTA layout, sizing limits, and deep link template
    knowledge-base.md          ← Business knowledge (loan journey, FAQs, rules)
    call-playbook.md           ← (optional) Manual call scripts, priority matrix, trigger conditions
    daily-ops.md               ← (optional) Daily execution loop, tracker fields, blocker codes
    data/
      dropoffs.csv             ← User drop-off CSV for ingestion

tests/sandbox/
  tenants/
    <tenant-id>/               ← Mirrors live tenants/, used for sandbox runs
      SOUL.md
      channel-rules.md         ← Same structure, utmCampaign = 'nudge_sandbox'
      knowledge-base.md
      data/dropoffs.csv
  mappings/                    ← Field mapping profiles for CSV normalization

skills/                        ← Company-agnostic agent framework skills
  supervisor-agent/SKILL.md
  recovery-specialist/SKILL.md
  support-specialist/SKILL.md
  compliance-guard/SKILL.md
  tooling-policy/SKILL.md
  persona-agent/SKILL.md       ← Generic fallback; overridden by tenant SOUL.md
  persuasion-policy/SKILL.md
  stage-router/SKILL.md        ← Route actions by loan stage + detected blocker
  call-escalation/SKILL.md     ← Decide when manual call needed (P1/P2/P3 priority)
  daily-ops-loop/SKILL.md      ← Guide daily batch processing workflow

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

At startup, `apps/agent-runtime` reads the `TENANT_ID` environment variable (default: `clickpe`) and loads:
- `tenants/${TENANT_ID}/SOUL.md` → injected as the LLM system prompt persona block
- `tenants/${TENANT_ID}/knowledge-base.md` → injected as knowledge context for every session
- `tenants/${TENANT_ID}/channel-rules.md` → configures the expected WhatsApp payload structure and deep link template
- `tenants/${TENANT_ID}/call-playbook.md` → (optional) manual call scripts and priority rules, injected when present
- `tenants/${TENANT_ID}/daily-ops.md` → (optional) daily execution loop and tracker config, injected when present

To **add a new company**, create `tenants/<id>/` with the three required markdown files (and optionally `call-playbook.md` and `daily-ops.md`) and set `TENANT_ID=<id>` in `.env`. No code changes are required.

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
- **Inbound Webhook Flow**: User replies on WhatsApp → `apps/api-gateway` (`/webhooks/whatsapp/gupshup`) parses Gupshup body → Maps phone number to `loanCaseId` via DB → Saves inbound message to `message_events` → POSTs chat history to `apps/agent-runtime` (`/agent/respond`).
- **Agent Generation Flow**: `/agent/respond` → Intent Classification → Checks chat history context → Skill & Prompt Assembly (with tenant SOUL + knowledge) → LLM Generation → Outbound Guardrail.
- **Prompt Assembly**: Tenant `SOUL.md` is the persona; framework skills (supervisor, specialist, compliance) provide structural behavior; `knowledge-base.md` and `channel-rules.md` provide business context and output format constraints.
- **Session Management**: `packages/session-memory/src/index.ts`. Sessions are compacted when tokens exceed limits, extracting `commitments` and `userObjections` to profile users across turns.
- **Payload & Dispatch**: The LLM natively dictates the final deeply-linked URL and CTA string as part of its strictly formulated `whatsappPayload` JSON block. `api-gateway` saves this response to DB and dispatches it immediately via `apps/channel-whatsapp`.

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
- `apps/agent-runtime` loads prompts/policies from `skills/*/SKILL.md` at runtime.
- Tenant `SOUL.md` takes precedence over `skills/persona-agent/SKILL.md` for persona.
- Supervisor chooses specialist skill context.
- Compliance guard skill applies to all outbound responses.
- Tool policy skill defines allowed tool usage and escalation boundaries.
- Stage router skill determines next action based on user stage and blocker.
- Call escalation skill evaluates whether a manual call is needed (P1/P2/P3).
- Daily ops loop skill guides batch processing workflows.
