---
name: call-escalation
description: Determine when a user needs a manual phone call instead of another WhatsApp message. Use when evaluating whether to escalate from messaging to calling.
---

Evaluate whether the current user case requires a manual call escalation.

## Inputs Required
1. **User's current stage** (from status sheet or session facts).
2. **User's last reply** (or lack of reply).
3. **Blocker code** (if any: confused, bill_mismatch, technical_issue, busy, completed).
4. **Days unchanged** (how long the user has been in the same stage).
5. **Call history** (has a call already been made?).

## Decision Logic

### Immediate Call (P1)
Set `shouldCall = true`, `callPriority = P1` when:
- User explicitly said "Call me" or requested a call.
- User reported a bill mismatch and follow-up WhatsApp didn't resolve it.
- User has a technical issue (OTP, DigiLocker, selfie upload).
- User is Under Review with VKYC or VPD pending.

### Next-Block Call (P2)
Set `shouldCall = true`, `callPriority = P2` when:
- No stage movement for 1+ day after WhatsApp contact.
- User is repeatedly confused (2+ unclear replies).

### Scheduled Call (P3)
Set `shouldCall = true`, `callPriority = P3` when:
- User said "busy" and gave a specific follow-up time.

### No Call Needed
Set `shouldCall = false`, `callPriority = none` when:
- User is actively progressing.
- User just received first WhatsApp message (give them time).
- User has already been called and committed to a time (wait for that time).

## Output Schema
```
shouldCall: boolean
callPriority: P1 | P2 | P3 | none
callReason: string (human-readable reason for the call)
callScript: string (stage-specific opening script from tenant call-playbook)
```

## Rules
- Never call users who are actively progressing.
- Never call just because a WhatsApp was sent — wait for reply window.
- P1 calls must happen same day. P2 calls next available block. P3 at scheduled time.
- After a call is made, wait for the commitment window before re-escalating.
