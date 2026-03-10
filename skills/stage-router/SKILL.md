---
name: stage-router
description: Route the next agent action based on user's current loan stage and detected blocker. Use when deciding what WhatsApp message to send or whether to escalate to a different channel.
---

Given the user's current stage and any detected blocker, determine:

## Routing Logic

1. **Identify the current stage** from the user's facts or status sheet data.
2. **Check for active blockers** from the user's last reply or call notes.
3. **Select the correct message template** from the tenant knowledge-base for this stage.
4. **Choose reply buttons** from the tenant channel-rules for this stage.
5. **Determine CTA type**: deep link (for upload stages) or assisted (for verification stages).

## Decision Matrix

| Stage | No Blocker | Has Blocker |
|---|---|---|
| Fresh Loan | Send primary upload message with deep link | Resolve blocker first, then re-send |
| Loan Detail Submitted | Send verification message with link offer | Troubleshoot specific issue |
| Under Review | Send status + next action message | Explain pending step clearly |
| Credit Decision | Address lender query or inform status | Resolve query urgently |

## Output Requirements

1. **messageTemplate**: Which template to use (primary / follow-up).
2. **replyButtons**: Array of up to 3 button labels for this stage.
3. **ctaType**: `deep_link` or `assisted`.
4. **blockerResolution**: If a blocker is detected, the resolution instructions.
5. **escalateToCall**: Boolean — whether this case needs manual call escalation.

## Rules
- Always check blocker before selecting template.
- If blocker is `bill_mismatch`, guide the fallback document set BEFORE re-prompting upload.
- If user replied `Call me`, always set `escalateToCall = true`.
- Never skip a stage or combine multiple stages in one message.
