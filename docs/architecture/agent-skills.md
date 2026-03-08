# Agent Skills Architecture

The runtime agent uses external skill specifications instead of fixed response scripts.

## Skill folders
- `skills/supervisor-agent/SKILL.md`
- `skills/recovery-specialist/SKILL.md`
- `skills/support-specialist/SKILL.md`
- `skills/compliance-guard/SKILL.md`
- `skills/tooling-policy/SKILL.md`

## How runtime uses skills
1. `agent-runtime` loads all `skills/*/SKILL.md` on startup.
2. Supervisor classifies turn intent and picks specialist context.
3. Compliance and tooling skills are always included in system prompt.
4. LLM output is still post-checked by deterministic guardrails (`safety-compliance`).

## Why this pattern
- Behavior can evolve by editing skill files without code rewrites.
- Tenant/provider-specific policy can be layered in prompt context.
- Keeps conversion style, compliance, and tool policy explicit and auditable.
