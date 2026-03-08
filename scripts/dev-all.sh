#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @apps/api-gateway dev &
pnpm --filter @apps/agent-runtime dev &
pnpm --filter @apps/ingestion-worker dev &
pnpm --filter @apps/status-sync-worker dev &
pnpm --filter @apps/channel-whatsapp dev &
pnpm --filter @apps/scheduler-worker dev &

wait
