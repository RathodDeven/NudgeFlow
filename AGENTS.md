# NudgeFlow Agent Context

This repository is the monorepo root for the NudgeFlow loan-reactivation MVP.

## Directory Structure

```
tenants/                       ← One folder per company deployment
  <tenant-id>/
    SOUL.md                    ← Agent persona, tone, identity, boundaries
    config.ts                  ← Deep link template, UTM params, CTA label
    knowledge-base.md          ← Business knowledge (loan journey, FAQs, rules)
    data/
      dropoffs.csv             ← User drop-off CSV for ingestion

tests/sandbox/
  tenants/
    <tenant-id>/               ← Mirrors live tenants/, used for sandbox runs
      SOUL.md
      config.ts                ← Same structure, utmCampaign = 'nudge_sandbox'
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

apps/                          ← Deployable services
packages/                      ← Shared, company-agnostic modules
infra/                         ← Docker and AWS bootstrap
docs/                          ← Architecture, API, runbooks
```

## How Tenant Loading Works

At startup, `apps/agent-runtime` reads the `TENANT_ID` environment variable (default: `muthoot`) and loads:
- `tenants/${TENANT_ID}/SOUL.md` → injected as the LLM system prompt persona block
- `tenants/${TENANT_ID}/knowledge-base.md` → injected as knowledge context for every session
- `tenants/${TENANT_ID}/config.ts` → configures deep link template, UTM params, and CTA button label

To **add a new company**, create `tenants/<id>/` with those three files and set `TENANT_ID=<id>` in `.env`. No code changes are required.

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

## Agent Architecture & User Flow
- **User Flow**: Inbound request → `/agent/respond` → Intent Classification → Safety/Escalation check → Skill & Prompt Assembly (with tenant SOUL + knowledge) → LLM Generation → Outbound Guardrail.
- **Prompt Assembly**: Tenant `SOUL.md` is the persona; framework skills (supervisor, specialist, compliance) provide structural behavior; `knowledge-base.md` provides business context.
- **Session Management**: `packages/session-memory/src/index.ts`. Sessions are compacted when tokens exceed limits, extracting `commitments` and `userObjections` to profile users across turns.
- **Deep Link**: `buildDeepLink(mobileNumber, tenantConfig)` generates a user-specific trackable URL. `buildWhatsAppMessage()` wraps the LLM output into a structured payload with a CTA button.

## Context Update Rule (Required)
When adding or changing any of the following, update context in the same PR/change set:
1. New service, package, queue, public endpoint, schema, env var, or external provider.
2. Any agent policy/behavior update (route rules, persuasion policy, compliance policy).
3. Any tenant addition (`tenants/<id>/`) or tenant config change.
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
