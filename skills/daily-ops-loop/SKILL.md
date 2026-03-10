---
name: daily-ops-loop
description: Guide the daily batch processing workflow for operational loan follow-ups. Use when processing a daily status sheet import or running the morning/afternoon/evening execution loop.
---

Execute the daily operational loop for batch user processing.

## Workflow Steps

### 1. Morning — Import & Compare
- Load today's status sheet.
- Compare each user's current stage with yesterday's stage.
- Tag each user: `moved` (stage changed), `unchanged` (same stage).

### 2. Morning — Bucket by Stage
- Group all `unchanged` users by their current stage.
- Each bucket gets the stage-specific WhatsApp message template.

### 3. Late Morning — First Touch
- For each stage bucket, generate and send the appropriate WhatsApp message.
- Use the primary message template for first contact, follow-up template for repeat contact.
- Attach the correct reply buttons for each stage.

### 4. Afternoon — Process Replies
- Read all incoming WhatsApp replies.
- Classify each reply and assign a blocker code if applicable.
- Update user tags: `replied`, `needs_call`.
- For resolved blockers, send the next-step message immediately.

### 5. Evening — Call Rescue
- Build the call queue from all `needs_call` users.
- Order by priority: P1 first, then P2, then P3.
- Execute calls using the stage-specific call scripts from the tenant call-playbook.
- Log call outcomes and commitments.

### 6. End of Day — Update Tracker
- Update all tracker fields for each user.
- Capture learnings: which blockers were most common, which resolutions worked.
- Prepare notes for next morning's comparison.

## Rules
- Status sheet updates once per day — do not expect real-time changes.
- `moved` users get no outreach (they progressed on their own).
- `unchanged` users always get a stage-specific message, never a generic reminder.
- Call queue is built AFTER processing WhatsApp replies, not before.
- Track all metrics defined in the tenant daily-ops configuration.
