# Sandbox Quickstart

Test the full NudgeFlow agent stack locally — agent responses, dashboard, WhatsApp, and CSV upload.

<!-- ## 1. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and n8n
pnpm db:compose:up

# Verify DB is ready (should show 12 tables)
sudo docker exec nudgeflow-postgres psql -U nudgeflow -c '\dt'
``` -->

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

## 4. Start Services (One Command)

```bash
# Gateway (3000), Runtime (3010), Dashboard (3050)
pnpm dev:all

# Optional: To include WhatsApp Channel (3040)
pnpm dev:full
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

## 9. Webhook Testing (ngrok)

To test inbound messages from real WhatsApp users locally:

1. **Install ngrok** (if not already installed):
   ```bash
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
   ```
2. **Start Tunnel**: `ngrok http --domain=dioeciously-untrinitarian-marilou.ngrok-free.dev 3000`
3. **Copy URL**: Use the https forwarding URL (e.g., `https://xyz.ngrok.app`).
4. **Set Webhook**: In Gupshup Dashboard:
   - **Callback URL**: `<Tunnel-URL>/webhooks/whatsapp/gupshup`
   - **Payload Format**: Select **Gupshup format (v2)** (Mandatory)
   - **Events**: Enable **Message Events** (Check "Message" box)
5. **Send Message**: Send a message to your Gupshup number.
6. **Observe**: Check `api-gateway` logs for `Gupshup Webhook Payload Received`. All event types (message, status, system) are logged for inspection.

## 10. Bolna Voice Webhook (Optional)

If you use Bolna for calls, configure its webhook to point at the API gateway:
- **Callback URL**: `<Tunnel-URL>/webhooks/voice/bolna`
- **Payload**: Execution data (includes `id`, `status`, `transcript`, `created_at`, `updated_at`, and `telephony_data`).

The webhook will:
- Map the execution to a user by phone number.
- Store transcripts and call metadata in `interaction_events` + `call_attempts`.
- Persist call summaries directly from Bolna webhook payload fields (`extracted_data` / `context_details` / transcript fallback).

For outbound calls, set `BOLNA_API_KEY`, `BOLNA_BASE_URL`, and `BOLNA_AGENT_ID` in `.env`.
If you want the call to appear from a specific number, set `BOLNA_FROM_NUMBER`.

Scheduling:
- Calls can be scheduled using Bolna’s `scheduled_at` timestamp. We align calls to the allowed windows (10:00–11:30 / 18:00–21:00 IST) and apply retries within the next hour after `no_answer`/`busy`/`failed`.
- Agent prompt variables are provided via `user_data` (see `packages/provider-bolna/src/agent-templates.ts`).

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
