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
  clickpe/
    SOUL.md                 ← Agent identity: name, persona, tone, language rules
    channel-rules.md        ← WhatsApp CTA layout, sizing limits, and deep link template
    knowledge-base.md       ← Business knowledge injected into every LLM session
    data/dropoffs.csv       ← Drop-off user data for ingestion

tests/sandbox/
  tenants/
    clickpe/                ← Sandbox mirror of live (utmCampaign = 'nudge_sandbox')
      SOUL.md / channel-rules.md / knowledge-base.md / data/dropoffs.csv
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
| `channel-rules.md` | WhatsApp message constraints, CTA button rules, and deep link formula |
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

**`tenants/acme/channel-rules.md`** — Channel limits & link building:
```markdown
## Deep Link Configuration
Use the following template, replacing `{{MOB_NUM}}` with the exact mobile number from the user's facts:
`https://your-app.com/resume?mob={{MOB_NUM}}&utm_source=acme_follow_up&utm_medium=whatsapp&utm_campaign=nudge_agent`

## WhatsApp CTA Button
ALWAYS use the exact label: `Resume Application 🚀`
```

**`tenants/acme/knowledge-base.md`** — Business knowledge (stages, document rules, FAQs).

Then set `TENANT_ID=acme` in `.env`. **No code changes or configs to compile.**

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
# pnpm db:compose:up        # Local Postgres removed. Use Neon DB instead.
```

### Sandbox Mode (For Testing Without Real APIs)
The sandbox lets you test agent responses and the Ops Dashboard without connecting to any real WhatsApp, OpenAI, or lender APIs.

```bash
# 1. Set TENANT_ID to use the sandbox tenant data
TENANT_ID=clickpe            # loads from tenants/clickpe/

# 2. Start the agent runtime only
pnpm dev --filter=@apps/agent-runtime

# 3. Start the Ops Dashboard (includes Chat Simulator tab)
pnpm dev --filter=@apps/ops-dashboard
```

Open the **Ops Dashboard → Simulator tab** at `http://localhost:3050`. You can:
- Type messages as a user and see Neha's responses in real-time
- Trigger proactive nudges to see the WhatsApp-formatted message with CTA button
- Change the user's loan stage and mobile number to test different scenarios

> **Sandbox data:** Edit `tests/sandbox/tenants/clickpe/data/dropoffs.csv` to add test users.  
> **Sandbox knowledge:** Edit `tests/sandbox/tenants/clickpe/knowledge-base.md` to update test context.

### Live Mode (Production / Staging)
```bash
# Full services
pnpm build
pnpm dev

# Or individual services
pnpm dev --filter=@apps/agent-runtime
pnpm dev --filter=@apps/ingestion-worker
```

> **Live data:** Place CSV files in `tenants/clickpe/data/dropoffs.csv`, then POST to `/ingestion/excel`.  
> **Live knowledge:** Edit `tenants/clickpe/knowledge-base.md`.

### Database Schema & Migrations
- **Master Schema**: [`packages/db/schema/schema.sql`](packages/db/schema/schema.sql)
- **Migrations**: [`packages/db/migrations/`](packages/db/migrations/)
- **Target**: Neon DB (Postgres)

---

## Environment Variables

### Minimum Required (Sandbox / Dev)
These are the only vars you need to run and test locally:

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `development` | |
| `PORT` | `3000` | API gateway port |
| `TZ` | `Asia/Kolkata` | Timezone for outreach window checks |
| `DATABASE_URL` | `postgres://user:pass@host/db?sslmode=require` | Neon DB (Sandbox/Dev) |
| `REDIS_URL` | `redis://localhost:6379` | (Optional) Local Docker Redis |
| `TENANT_ID` | `clickpe` | Loads `tenants/clickpe/` by default |
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

## Local Service Ports
| Service | Port |
|---|---|
| `api-gateway` | `3000` |
| `agent-runtime` | `3010` |
| `ingestion-worker` | `3020` |
| `status-sync-worker` | `3030` |
| `channel-whatsapp` | `3040` |
| `ops-dashboard` | `3050` |

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

---

## TODO / Future Roadmap

### Redis & n8n Automation (Future Roadmap)

Both Redis and n8n are included for future scalability (e.g., real-time updates and complex automation) but are **NOT required for the current MVP phase**.

- **Redis**: Will be used for session caching and real-time event pub/sub.
- **n8n**: Will be used for scheduled outreach and batch processing. The current operating model is fully **Human-in-the-Loop (HITL)**.

**When n8n becomes valuable:** Once the pilot proves the agent works correctly and the team is comfortable removing the human approval step, n8n can automate:

| Workflow | Trigger | What it does |
|---|---|---|
| **Daily batch nudge** | Cron (9 AM IST) | Loop through all `FRESH_LOAN` users, call `agent-runtime` for each, send WhatsApp via `channel-whatsapp` |
| **Scheduled follow-ups** | Timer per user | Auto-retry users who didn't respond within 24h |
| **WhatsApp webhook relay** | Gupshup webhook | Receive inbound WhatsApp → forward to `agent-runtime` → auto-reply |
| **Ops alerts** | Event-driven | Slack/email notification when a P1 call escalation is created |
| **CSV ingestion** | File upload trigger | Watch a folder/S3 bucket for new CSVs → auto-import to DB |

**Action items when ready:**
1. Import the existing skeleton workflows into n8n UI (`http://localhost:5678`)
2. Build the daily batch workflow using the template pattern (Schedule Trigger → HTTP Request → agent-runtime)
3. Add a WhatsApp Trigger node pointing to `channel-whatsapp` webhook
4. Gradually remove HITL approval gates as confidence grows
---

## Project Rollout Phases

NudgeFlow is being developed and deployed in three deliberate phases to ensure quality and safety:

### Phase 1: Human-in-the-Loop (Current)
- **Goal:** Test LLM prompt quality and ensure relevancy without risking bad messages sent to real users.
- **Process:** Admin uploads CSV → Users appear in dashboard → Admin clicks "Simulate" to see the AI-generated message → Admin manually reviews and sends via WhatsApp (or calls).
- **No Automation:** No messages are sent automatically upon CSV upload. 

### Phase 2: Sandbox Automation
- **Goal:** Test end-to-end automation in a safe environment.
- **Process:** Admin uploads CSV → System automatically generates and sends the **first outreach message** to each user via the Sandbox WhatsApp number.
- **Focus:** Validating webhook delivery, state transitions, and automatic follow-ups without human intervention.

### Phase 3: Live Production
- **Goal:** Full scale automated reactivation for real users.
- **Process:** API connects to the lender → Drop-offs are ingested automatically → Agent sends approved WhatsApp templates → Conversational AI handles replies.
- **Focus:** Tracking conversion metrics, user turnover, and ROI.

---

## Important: WhatsApp Business API Constraints
When using the Gupshup API (or any WhatsApp Business provider), there is a strict rule regarding **Template vs. Free-form (Session) Messages**:

1. **The 24-Hour Window:** When a user replies to your WhatsApp number, a 24-hour "customer service window" opens. Inside this window, the AI Agent can generate and send **any free-form text**.
2. **Template Messages:** If the 24-hour window is closed (or hasn't opened yet, e.g., reaching out to a user who just dropped off), you **CANNOT** send generated text. You **MUST** send a pre-approved WhatsApp Template Message (e.g., `"Hi {{name}}, your loan application is pending at {{stage}}. Click below to resume."`).

**Impact on NudgeFlow:**
- The **very first message** sent to a user from the CSV dropoff list *must* be an approved template. 
- Once the user taps a reply button or types a response, the AI agent takes over and generates dynamic, personalized responses.
