# Sandbox Quickstart

Test the full NudgeFlow agent stack locally — agent responses, dashboard, WhatsApp, and CSV upload.

## 1. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and n8n
pnpm db:compose:up

# Verify DB is ready (should show 12 tables)
sudo docker exec nudgeflow-postgres psql -U nudgeflow -c '\dt'
```

## 2. Configure Environment

```bash
cp .env.example .env
# Edit .env — set at minimum:
#   TENANT_ID=clickpe
#   OPENAI_API_KEY=sk-...  (required for LLM responses)
# Optional:
#   GUPSHUP_API_KEY + GUPSHUP_APP_NAME  (for real WhatsApp delivery)
#   SARVAM_API_KEY  (for language detection, regex fallback works without it)
```

## 3. Install & Build

```bash
pnpm install
pnpm build     # Builds all packages (including @nudges/db)
```

## 4. Start Services

Open 3 terminals:

```bash
# Terminal 1: API Gateway (port 3000) — handles auth, CSV upload, user management
pnpm dev --filter=@apps/api-gateway

# Terminal 2: Agent Runtime (port 3010) — LLM reasoning
pnpm dev --filter=@apps/agent-runtime

# Terminal 3: Ops Dashboard (port 3050) — admin UI
pnpm dev --filter=@apps/ops-dashboard
```

**Optional** — for real WhatsApp delivery:
```bash
# Terminal 4: WhatsApp Channel (port 3040)
pnpm dev --filter=@apps/channel-whatsapp
```

## 5. Open Dashboard

Go to **http://localhost:3050**

Login with:
- **Username:** `admin`
- **Password:** `admin@123`  (or whatever you set in `.env`)

## 6. Upload Users

1. Go to **Dashboard tab → 📤 Upload Users (CSV)**
2. Select `tenants/clickpe/data/dropoffs.csv`
3. Preview the parsed rows
4. Click **Upload** — users are stored in PostgreSQL

## 7. Test Agent

1. Go to **Sandbox Simulator** tab
2. **Select a user** from the dropdown (or type manually)
3. Type a message like "mera loan kahan tak aaya?"
4. See Neha's response with WhatsApp-style formatting

### WhatsApp Testing
- Toggle **📱 Send via WhatsApp** — agent responses will be sent to `9484812168` via Gupshup
- Use **Send Direct WhatsApp** to send any text directly
- Requires `channel-whatsapp` running on port 3040 with valid Gupshup credentials

## 8. Test Call Queue

The Dashboard tab shows mock call queue entries:
- **P1 (red)** — Kamini — bill mismatch
- **P2 (orange)** — Surinder — no movement
- **P3 (yellow)** — Rahul — technical issue

Click **▶ Show Call Script** to see what to say on the call.

## Service Ports

| Service | Port | Purpose |
|---|---|---|
| `api-gateway` | 3000 | Auth, CSV upload, user API |
| `agent-runtime` | 3010 | LLM agent reasoning |
| `channel-whatsapp` | 3040 | WhatsApp send/receive via Gupshup |
| `ops-dashboard` | 3050 | Admin dashboard UI |
| PostgreSQL | 5432 | User data, sessions, events |
| Redis | 6379 | Queue/cache (future use) |

## Troubleshooting

| Issue | Fix |
|---|---|
| `agent-runtime` returns errors | Check `OPENAI_API_KEY` in `.env` |
| WhatsApp send fails | Check `GUPSHUP_API_KEY` + `GUPSHUP_APP_NAME` in `.env` |
| CSV upload 401 | Login again — session may have expired |
| DB connection refused | Run `pnpm db:compose:up` |
