---
name: channel-rules
description: WhatsApp channel configuration for ClickPe — CTA layout, deep link template, reply buttons, and messaging constraints.
---

## Approved WhatsApp Templates

The system must use these exact pre-approved Meta templates when initiating contact outside the 24-hour customer service window.

### Template: Initial Outreach (Fresh Loan)
- **Gupshup Template ID:** `567063dd-09e1-46f1-92a8-dd7f94bea415`
- **Template Name:** `clickpe_loan_recovery_v1`
- **Category:** Utility
- **Language:** Hinglish
- **Body Text:** "Namaste {{1}}! 🙏\n\nAapka ₹{{2}} ka business loan offer expire hone wala hai. ⏳\n\nSirf 1 aakhri step bacha hai: Please upload your {{3}}.\n\nAapne pehle hi process start kar diya hai, ise miss mat kijiye. Ye funds aapke business growth ke liye block kiye gaye hain.\n\nNeeche diye button par click karein aur 2 minute mein process poora karein. 👇"
- **Variable Mapping:**
  - `{{1}}`: Applicant's First Name
  - `{{2}}`: Loan Amount
  - `{{3}}`: Exact pending document/step
- **Buttons (Strict Order):**
  1. URL Button: `Claim Reserved Funds` (URL suffix variable: `{{1}}` = `mobile_number`)
  2. Quick Reply: `Bill mismatch`
  3. Quick Reply: `Call me`

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
