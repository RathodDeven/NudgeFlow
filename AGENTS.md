# NudgeFlow Agent Context

This repository is the monorepo root for the NudgeFlow loan-reactivation MVP.

## Architecture Snapshot
- `apps/`: deployable services (`api-gateway`, `agent-runtime`, `scheduler-worker`, `ingestion-worker`, `status-sync-worker`, `channel-whatsapp`, `ops-dashboard`, `n8n` assets).
- `packages/`: shared domain contracts and pluggable modules (`domain`, `session-memory`, `persuasion-core`, `safety-compliance`, `knowledge-runtime`, provider and channel adapters, observability, config).
- `infra/`: Docker and AWS bootstrap assets.
- `docs/`: architecture, API, runbooks.
- `skills/`: agent behavior specs (`SKILL.md`) for supervisor/specialists/guardrails/tool policy.
- `tests/sandbox/`: dummy data, mapping profiles, and sample knowledge packs.

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
2. Keep modules reusable and provider/channel/model-agnostic.
3. Prefer configuration and skills over hardcoded response text.
4. Add or update Zod contracts in `packages/domain` before cross-service behavior changes.
5. Keep integration logic in `apps/n8n` workflows; business decisions stay in TypeScript services.
6. Run lint/format with Biome conventions.
7. Update `AGENTS.md` whenever architecture, module boundaries, execution workflow, or global engineering rules change.

## Context Update Rule (Required)
When adding or changing any of the following, update context in the same PR/change set:
1. New service, package, queue, public endpoint, schema, env var, or external provider.
2. Any agent policy/behavior update (route rules, persuasion policy, compliance policy).
3. Any skill change in `skills/`.
4. Any architectural change (service topology, ownership boundaries, app/package responsibilities, auth model, deployment flow).

Required updates:
- Update `docs/architecture/overview.md` and relevant docs under `docs/api` or `docs/runbooks`.
- Update `.env.example` for new env vars.
- Update/extend a relevant `SKILL.md` when behavior/policy changes.
- Update `AGENTS.md` when the architecture or global developer-agent rules change.

## Post-Change Quality Gate (Run After Every Chat Request With Code Changes)
1. Run Biome checks: `pnpm lint` (or `biome check .`).
2. If Biome fails, fix with `pnpm lint:fix` (or `biome check --write .`), then re-run lint.
3. Run TypeScript checks: `pnpm typecheck`.
4. If TypeScript errors exist, fix them and re-run `pnpm typecheck` until clean.
5. If any lint/typecheck command is broken or outdated, fix the repo scripts/configs (`package.json`, tooling configs, turbo tasks) and re-run checks.
6. Report clearly when checks cannot run due to environment limits (for example network/package-install restrictions).

## Skill Loading Contract
- `apps/agent-runtime` must load prompts/policies from `skills/*/SKILL.md` at runtime.
- Supervisor chooses specialist skill context.
- Compliance guard skill applies to all outbound responses.
- Tool policy skill defines allowed tool usage and escalation boundaries.
