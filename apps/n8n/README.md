# n8n Integration Layer

This folder stores n8n assets only.

Rules:
1. Keep business logic in TypeScript services.
2. Use n8n for triggers, webhook routing, and ops notifications.
3. Export workflows as versioned JSON into `workflows/`.

## Workflows
- `excel-ingestion-trigger.json`: receives file trigger and calls ingestion-worker.
- `status-poll-trigger.json`: scheduled trigger for poll orchestration.
- `ops-alerts.json`: sends alerts for handoffs and failures.
