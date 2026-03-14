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
    PROFILE.md              ← Agent identity: name, persona, tone, language rules
    CHANNEL.md              ← WhatsApp CTA layout, sizing limits, and deep link template
    KNOWLEDGE.md            ← Tenant-specific product knowledge
    WORKFLOWS.md            ← [NEW] Tenant-specific rescue scenarios (e.g. Bill Mismatch)
    data/dropoffs.csv       ← Drop-off user data for ingestion

prompts/                    ← [NEW] Centralized Global Multi-Tenant Instructions (Pure)
  IDENTITY.md               ← Global persona and Hinglish rules
  WORKFLOWS.md              ← Global nudge strategy and support reasoning
  CONSTRAINTS.md            ← Messaging limits and channel rules
  SYSTEM.md                 ← Safety and escalation protocols
  KNOWLEDGE.md              ← Universal business knowledge (MSME basics)

[DEPRECATED] skills/        ← Legacy behavior logic (now merged into prompts/ and tenants/)

apps/                       ← Deployable services
packages/                   ← Shared, company-agnostic modules
infra/                      ← Docker and cloud bootstrap
```

---

All company-specific content lives in `tenants/<tenant-id>/`. The runtime merges global instructions from `prompts/` with tenant-specific overrides:

| File | Level | Purpose |
|---|---|---|
| `prompts/IDENTITY.md` | Global | Core persona, tone, and Hinglish-first rules |
| `tenants/*/PROFILE.md`| Tenant | Brand metadata (Agent Name, Company, Emoji) |
| `prompts/WORKFLOWS.md`| Global | High-level recovery and support strategies |
| `tenants/*/WORKFLOWS.md`| Tenant | Specific rescue flows (e.g. Bill Mismatch resolution) |
| `prompts/CONSTRAINTS.md`| Global | Global messaging limits and WhatsApp rules |
| `tenants/*/CHANNEL.md` | Tenant | WhatsApp template IDs and deep link configuration |
| `prompts/KNOWLEDGE.md` | Global | Universal business knowledge (MSME basics) |
| `tenants/*/KNOWLEDGE.md`| Tenant | Tenant-specific product facts and FAQs |

### Adding A New Company

To add a new tenant (e.g. `acme`), create `tenants/acme/` with four required files:

**`tenants/acme/PROFILE.md`** — Brand metadata:
```markdown
## Profile
- Name: Priya
- Company: Acme Finance
- Partner: Muthoot Finance
- Emoji: 🚀
```

**`tenants/acme/CHANNEL.md`** — Channel config:
```markdown
## Deep Link template
`https://acme.nudgeflow.io/resume?m={{MOB_NUM}}`

## Buttons
- Label: `Resume Now`
```

**`tenants/acme/WORKFLOWS.md`** — Contextual scenarios (e.g. Bill Mismatch).
**`tenants/acme/KNOWLEDGE.md`** — Tenant-specific interest rates and office facts.

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

# 3. Start the Ops Dashboard (Ensure VITE_ENABLE_SANDBOX=true in .env)
pnpm dev --filter=@apps/ops-dashboard
```

Open the **Ops Dashboard** at `http://localhost:3050`. Because you have `VITE_ENABLE_SANDBOX=true`, you will see a 🧪 Sandbox Simulator UI appearing inside the user detail view. You can:
- Type messages as a user and see Neha's responses in real-time
- Trigger proactive nudges to see the WhatsApp-formatted message with CTA button
- Change the user's loan stage and mobile number to test different scenarios

> **Sandbox data:** Edit `tests/sandbox/tenants/clickpe/data/dropoffs.csv` to add test users.  
> **Sandbox knowledge:** Edit `tests/sandbox/tenants/clickpe/knowledge-base.md` to update test context.

### Live Mode (Production / Staging)
```bash
# 1. Start all core services in one terminal
pnpm dev:all

# 2. To include WhatsApp channel (port 3040)
pnpm dev:full

# Or individual services
pnpm dev --filter=@apps/agent-runtime
```

> **Live data:** Place CSV files in `tenants/clickpe/data/dropoffs.csv`, then POST to `/ingestion/excel`.  
> **Live knowledge:** Edit `tenants/clickpe/knowledge-base.md`.

### Local Webhook Testing (with ngrok)
To test incoming WhatsApp messages locally, you need a tunnel to your port 3000.

1. **Install ngrok**:
   ```bash
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
   ```
2. **Start Tunnel**:
   ```bash
   ngrok http 3000
   ```
3. **Configure Gupshup.ai**:
   - Copy the `Forwarding` URL (e.g., `https://random-id.ngrok-free.app`).
   - Append `/webhooks/whatsapp/gupshup`.
   - Set this as your **Inbound Webhook URL** in the Gupshup.ai Dashboard.
   - **Important Settings**:
     - **Payload Format**: Select **Gupshup format (v2)** (our parser expects this structure).
     - **Event Selection**: Enable **Message Events** (specifically the "Message" type).

#### Webhook URLs
- **Local (via ngrok)**: `https://<your-ngrok-subdomain>.ngrok-free.app/webhooks/whatsapp/gupshup`
- **Production**: `https://api.nudgeflow.io/webhooks/whatsapp/gupshup` (Replace with your actual domain)

## Webhook Setup (Required)

NudgeFlow uses **separate webhook endpoints** for WhatsApp and voice events. Do not reuse one URL for both providers.

### 1) Gupshup WhatsApp Inbound Webhook
- Endpoint path: `/webhooks/whatsapp/gupshup`
- Local example: `https://<your-ngrok-subdomain>.ngrok-free.app/webhooks/whatsapp/gupshup`
- Production example: `https://<your-api-domain>/webhooks/whatsapp/gupshup`
- Purpose: inbound user WhatsApp messages and replies.

### 2) Bolna Voice Webhook
- Endpoint path: `/webhooks/voice/bolna`
- Local example: `https://<your-ngrok-subdomain>.ngrok-free.app/webhooks/voice/bolna`
- Production example: `https://<your-api-domain>/webhooks/voice/bolna`
- Purpose: call execution status, transcript, and extracted/custom analytics payloads.

### Data Ingestion from Bolna Analytics
- `api-gateway` ingests Bolna webhook payloads and stores:
  - call history in `interaction_events` and `call_attempts`
  - latest inferred snapshot on `loan_cases` (`inferred_intent`, `high_intent_flag`, `follow_up_at`, `call_summary_latest`, and extraction/context JSON)
- Export endpoint for ops: `GET /users/export/inferred.csv`

### Bolna Voice (Optional)
Bolna’s execution payloads include fields like `id`, `status`, `transcript`, `created_at`, `updated_at`, and `telephony_data` with `duration`, `to_number`, `from_number`, `provider_call_id`, and `call_type`.  
Set your Bolna webhook to `POST /webhooks/voice/bolna` so execution payloads are ingested and saved to `interaction_events` and `call_attempts`.

Bolna API calls require an API key passed as `Authorization: Bearer <api_key>`. Calls are created with `agent_id` and `recipient_phone_number`, can be scheduled via `scheduled_at`, and can pass `user_data` for prompt variables. The agent’s welcome message and prompt templates live in `packages/provider-bolna/src/agent-templates.ts` and use variable placeholders that map to `user_data`.

Implemented:
- Outbound call initiation to Bolna with session context (`user_data`).
- Automatic summarization of call transcripts for agent inference.
- Follow-up scheduling based on call summary `suggestedNextCallAt` plus retry policy windows.

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
| `VITE_ENABLE_SANDBOX` | `true` | Shows Sandbox simulator UI in Dashboard |
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
| `OPENAI_MODEL_ROUTINE` | OpenAI | Default `gpt-5-nano-2025-08-07` (everyday messages) |
| `OPENAI_MODEL_COMPLEX` | OpenAI | Default `gpt-5-mini-2025-08-07` (complaints, escalations) |
| `SARVAM_API_KEY` | Sarvam AI | Required for real language detection. Without it, heuristic regex is used. |
| `SARVAM_BASE_URL` | Sarvam AI | Default `https://api.sarvam.ai` |
| `BOLNA_API_KEY` | Bolna | Required for API calls (outbound calls, execution fetch). |
| `BOLNA_BASE_URL` | Bolna | Default `https://api.bolna.ai` |
| `BOLNA_AGENT_ID` | Bolna | Agent used for outbound calls |
| `BOLNA_FROM_NUMBER` | Bolna | Optional caller ID for outbound calls |
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
| **WhatsApp webhook relay** | *(Natively Implemented)* | Receive inbound WhatsApp on `/webhooks/whatsapp/gupshup` → save to DB → forward to `agent-runtime` → auto-reply |
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
