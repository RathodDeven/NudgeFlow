---
name: channel-rules
description: WhatsApp channel configuration for ClickPe — CTA layout, deep link template, reply buttons, and messaging constraints.
---

## Deep Link Configuration
When the nudge strategy involves sending the user back into the flow, use a URL button.
To construct the Deep Link for the user, use the following template, replacing `{{MOB_NUM}}` with the exact mobile number from the user's facts:

`https://los-prod.dailype.in/muthoot/session-link?mob_num={{MOB_NUM}}&utm_source=muthoot_follow_up&utm_medium=whatsapp&utm_campaign=clickpe_nudge`

## WhatsApp CTA Button
If you decide to include a URL button in the WhatsApp message payload, ALWAYS use the exact label:
`Apply Karo Abhi 🚀`

## Reply Button Configuration
WhatsApp interactive messages support up to **3 reply buttons**. Use stage-specific buttons:

### Fresh Loan Stage
- `Upload now`
- `Bill mismatch`
- `Call me`

### Loan Detail Submitted Stage
- `Send link`
- `Facing issue`
- `Call me`

### Under Review Stage
- `Explain step`
- `Call me`
- `Done`

## Messaging Constraints
1. **One message = one action** — never combine multiple asks.
2. **Single screen length** — message must be readable without scrolling.
3. **No generic reminders** — every message must specify the exact pending step.
4. **Max 450 characters** body text.
5. **Prefer reply buttons** over free-text responses for structured data collection.
6. **Never promise approval** — only guide the operational process.
7. **No promotional messages** — this is operational, not marketing.
8. **Ask only for required documents** — Udyam + electricity bill (or fallback set). Never GST/bank statements for Fresh Loan.
