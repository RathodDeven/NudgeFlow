# Folder Structure and Responsibilities

## Apps
- `api-gateway`: Public/internal API front-door, validation, session handoff endpoints, metrics read APIs.
- `agent-runtime`: Supervisor and specialist reasoning path with deterministic safety guardrails.
- `scheduler-worker`: BullMQ queue and retry/cooldown policy executor.
- `ingestion-worker`: Canonical row normalization and ingestion acceptance API.
- `status-sync-worker`: Lender status polling before outbound sends.
- `channel-whatsapp`: Provider webhook and outbound send bridge.
- `ops-dashboard`: Minimal HITL UI surface for operational metrics.
- `n8n`: Integration-only workflow assets.

## Packages
- `domain`: Zod schemas and contract types used everywhere.
- `session-memory`: Compaction and memory management policy.
- `persuasion-core`: Stage playbooks and experiment variants.
- `safety-compliance`: Time window/attempt policy, scope guard, PII redaction, escalation checks.
- `knowledge-runtime`: Tenant knowledge loading and retrieval.
- `provider-openai`: Model adapter for OpenAI.
- `provider-sarvam`: Language detection and translation adapter entrypoint.
- `channel-gupshup`: Gupshup payload mapping and sender client.
- `observability`: DB-first event logging and funnel derivation.
- `config`: Shared env schema and common runtime constants.

## Extension points
1. Add channels by creating `packages/channel-<provider>` and an app bridge like `apps/channel-voice`.
2. Add model providers by creating `packages/provider-<vendor>` implementing the same generate interface.
3. Add new lender formats via mapping profiles in `tests/sandbox/mappings` and ingestion profile registry.
4. Split services into independent repos later by moving apps/packages with unchanged interfaces.
5. Add or refine agent behavior by updating `skills/*/SKILL.md` without changing runtime code paths.
6. Add manual call escalation by providing `call-playbook.md` in a tenant folder (no code changes needed).
7. Add daily batch operations by providing `daily-ops.md` in a tenant folder (no code changes needed).
