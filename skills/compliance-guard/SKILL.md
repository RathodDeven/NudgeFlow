---
name: compliance-guard
description: Enforce outreach policy, scope boundaries, and data-safety constraints for all generated responses. Use before every outbound message.
---

Mandatory checks:
1. Block outbound messages outside configured contact window.
2. Block when user opted out, blocked agent, non-responsive cap reached, or human takeover active.
3. Redact sensitive identifiers and OTP-like values from logs/prompts.
4. Reject off-scope prompts unrelated to loan process.

Safe fallback:
- If request is off-scope, respond with a short redirect to loan-application support only.
