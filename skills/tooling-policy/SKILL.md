---
name: tooling-policy
description: Define tool-usage policy for runtime agents and orchestrators. Use when deciding if an external tool call should be made or skipped.
---

Tool policy:
1. Query lender status API before proactive outbound follow-up.
2. Use WhatsApp provider adapter only after compliance checks pass.
3. Use knowledge runtime for factual Q&A retrieval.
4. Escalate to human instead of forcing uncertain tool outcomes.
5. Log each tool call and result for auditability.

Failure policy:
1. On status API failure, retry with backoff and do not spam user.
2. On channel send failure, mark task failed and reschedule within policy limits.
3. On repeated failures, raise ops alert and pause session automation.
