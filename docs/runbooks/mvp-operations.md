# MVP Operations Runbook

## Daily checks
1. Queue health (`followup_queue` delayed/failed counts).
2. Scheduled actions backlog (`scheduled_actions` pending/processing count).
2. WhatsApp delivery errors and blocked users.
3. Funnel metrics (reached, replied, resumed, progressed, converted).
4. Handoff sessions waiting for human action.
5. Dashboard auth status (`/auth/login` works with configured admin credentials).

## Incident responses
- `outside_contact_window` spikes: verify timezone config.
- repeated `cooldown_active` or `attempt_limit_reached`: review policy settings + `policy_events`.
- high failures in status polling: switch to cached stage and retry later.
- repeated out-of-scope prompts: tighten guardrail regex and policy prompts.
