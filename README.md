# NudgeFlow Loan Recovery MVP

WhatsApp-first proactive loan reactivation agent — multi-tenant, modular, built with TypeScript, pnpm workspaces, and Turborepo.

## Documentation
- Architecture overview: [`docs/architecture/overview.md`](docs/architecture/overview.md)
- API endpoints: [`docs/api/endpoints.md`](docs/api/endpoints.md)
- MVP runbook: [`docs/runbooks/mvp-operations.md`](docs/runbooks/mvp-operations.md)

---

## Monorepo Layout

```
tenants/                    ← One folder per company (all company-specific data)
  muthoot/
    SOUL.md                 ← Agent identity: name, persona, tone, language rules
    config.ts               ← Deep link template, UTM tracking, CTA button label
    knowledge-base.md       ← Business knowledge injected into every LLM session
    data/dropoffs.csv       ← Drop-off user data for ingestion

tests/sandbox/
  tenants/
    muthoot/                ← Sandbox mirror of live (utmCampaign = 'nudge_sandbox')
      SOUL.md / config.ts / knowledge-base.md / data/dropoffs.csv
  mappings/                 ← CSV field-mapping profiles

skills/                     ← Company-agnostic agent framework
  supervisor-agent/         ← Orchestrates specialist selection
  recovery-specialist/      ← Handles loan reactivation nudges
  support-specialist/       ← Handles user questions
  compliance-guard/         ← Guardrails on all outbound messages
  tooling-policy/           ← Tool usage rules
  persona-agent/            ← Generic persona fallback (overridden by tenant SOUL.md)

apps/                       ← Deployable services
packages/                   ← Shared, company-agnostic modules
infra/                      ← Docker and cloud bootstrap
```

---

## Multi-Tenant Architecture

All company-specific content lives in `tenants/<tenant-id>/`. The runtime selects the active tenant via `TENANT_ID` env var and loads:

| File | Purpose |
|---|---|
| `SOUL.md` | Agent persona, tone, language rules, goals, and boundaries for this company's users |
| `config.ts` | Deep link URL template, UTM params, CTA button label |
| `knowledge-base.md` | Business knowledge (stages, documents, rules) injected verbatim into every LLM session |
| `data/dropoffs.csv` | CSV file of users who dropped off — ingested via `ingestion-worker` |

### Adding A New Company

```bash
mkdir -p tenants/acme
```

Then create three files:

**`tenants/acme/SOUL.md`** — Agent identity:
```markdown
## Identity
- Name: Priya
- Company: Acme Finance
- Language: Default English, switch to Hindi if user replies in Hindi

## Persona & Tone
You are Priya...

## Boundaries
- Only discuss loan applications, status, and required documents.
```

**`tenants/acme/config.ts`** — Campaign config:
```typescript
const config = {
  deepLinkTemplate: 'https://your-app.com/resume?mob={{MOB_NUM}}&utm_source={{UTM_SOURCE}}&...',
  utmSource: 'acme_follow_up',
  utmMedium: 'whatsapp',
  utmCampaign: 'nudge_agent',
  ctaButtonLabel: 'Resume Application 🚀'
}
export default config
```

**`tenants/acme/knowledge-base.md`** — Business knowledge (stages, document rules, FAQs).

Then set `TENANT_ID=acme` in `.env`. **No code changes needed.**

### Structuring `knowledge-base.md`
The file is injected verbatim into the LLM system prompt for every session. Keep it concise and authoritative:
- Use `## Stage Name` headers to group stages
- Use short bullet points for rules
- Avoid prose — the agent needs scannable facts, not essays

---

## Running The Project

### Prerequisites
```bash
cp .env.example .env        # Configure required variables (see below)
pnpm install
pnpm db:compose:up          # Start local Postgres + Redis via Docker
```

### Sandbox Mode (For Testing Without Real APIs)
The sandbox lets you test agent responses and the Ops Dashboard without connecting to any real WhatsApp, OpenAI, or lender APIs.

```bash
# 1. Set TENANT_ID to use the sandbox tenant data
TENANT_ID=muthoot            # loads from tests/sandbox/tenants/muthoot/

# 2. Start the agent runtime only
pnpm dev --filter=@apps/agent-runtime

# 3. Start the Ops Dashboard (includes Chat Simulator tab)
pnpm dev --filter=@apps/ops-dashboard
```

Open the **Ops Dashboard → Simulator tab** at `http://localhost:3050`. You can:
- Type messages as a user and see Neha's responses in real-time
- Trigger proactive nudges to see the WhatsApp-formatted message with CTA button
- Change the user's loan stage and mobile number to test different scenarios

> **Sandbox data:** Edit `tests/sandbox/tenants/muthoot/data/dropoffs.csv` to add test users.  
> **Sandbox knowledge:** Edit `tests/sandbox/tenants/muthoot/knowledge-base.md` to update test context.

### Live Mode (Production / Staging)
```bash
# Full services
pnpm build
pnpm dev

# Or individual services
pnpm dev --filter=@apps/agent-runtime
pnpm dev --filter=@apps/ingestion-worker
```

> **Live data:** Place CSV files in `tenants/muthoot/data/dropoffs.csv`, then POST to `/ingestion/excel`.  
> **Live knowledge:** Edit `tenants/muthoot/knowledge-base.md`.

---

## Environment Variables

### Minimum Required (Sandbox / Dev)
These are the only vars you need to run and test locally:

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `development` | |
| `PORT` | `3000` | API gateway port |
| `TZ` | `Asia/Kolkata` | Timezone for outreach window checks |
| `DATABASE_URL` | `postgres://nudgeflow:nudgeflow@localhost:5432/nudgeflow` | Local Docker Postgres |
| `REDIS_URL` | `redis://localhost:6379` | Local Docker Redis |
| `TENANT_ID` | `muthoot` | Loads `tenants/muthoot/` by default |
| `AGENT_SKILLS_DIR` | `skills` | Path to agent skill files |
| `ADMIN_USERNAME` | `admin` | Ops dashboard login |
| `ADMIN_PASSWORD` | `change_me` | Ops dashboard login |
| `DASHBOARD_AUTH_SECRET` | Any random string | JWT signing secret |

### Optional (Enable Real Services)
Only needed when connecting to live APIs:

| Variable | Service | Notes |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI | Required for real LLM-generated replies. Without it, deterministic fallback messages are used. |
| `OPENAI_MODEL_ROUTINE` | OpenAI | Default `gpt-5-mini` (everyday messages) |
| `OPENAI_MODEL_COMPLEX` | OpenAI | Default `gpt-5.1` (complaints, escalations) |
| `SARVAM_API_KEY` | Sarvam AI | Required for real language detection. Without it, heuristic regex is used. |
| `SARVAM_BASE_URL` | Sarvam AI | Default `https://api.sarvam.ai` |
| `GUPSHUP_API_KEY` | Gupshup | Required to send real WhatsApp messages |
| `GUPSHUP_APP_NAME` | Gupshup | WhatsApp source app name |
| `GUPSHUP_BASE_URL` | Gupshup | Default `https://api.gupshup.io` |
| `LENDER_STATUS_API_BASE_URL` | Lender API | Required for real loan status polling |
| `LENDER_STATUS_API_KEY` | Lender API | Auth key for status polling |
| `N8N_ENCRYPTION_KEY` | n8n | Required when running n8n orchestration |
| `N8N_HOST` | n8n | Default `localhost` |
| `N8N_PORT` | n8n | Default `5678` |

---

## Local Service Ports
| Service | Port |
|---|---|
| `api-gateway` | `3000` |
| `agent-runtime` | `3010` |
| `ingestion-worker` | `3020` |
| `status-sync-worker` | `3030` |
| `channel-whatsapp` | `3040` |
| `ops-dashboard` | `3050` |
| `n8n` | `5678` |

---

## Quality Checks
```bash
pnpm lint          # Biome linting
pnpm lint:fix      # Auto-fix lint issues
pnpm typecheck     # TypeScript type checking
pnpm format:check  # Format check
```

## MVP Guardrails
- Outreach window: 08:00–19:00 local time only.
- Max 3 outreach attempts per user within 7 days.
- Messages are informational only — no fabricated incentives or aggressive pressure.
- Stop outreach on blocked, opt-out, non-responsive, or human takeover.
- Ops Dashboard endpoints require admin auth.
