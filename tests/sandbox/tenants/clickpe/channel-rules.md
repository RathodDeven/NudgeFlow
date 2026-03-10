---
name: channel-rules
description: WhatsApp channel configuration for ClickPe — CTA layout, deep link template, reply buttons, and messaging constraints.
---

## Approved WhatsApp Templates

The system must use these exact pre-approved Meta templates when initiating contact outside the 24-hour customer service window.

### Template: Initial Outreach (Fresh Loan)
- **Template Name:** `clickpe_fresh_loan_nudge`
- **Category:** Utility
- **Language:** English
- **Body Text:** "Hi {{1}} 🌟\n\nMain {{2}} bol rahi hoon {{3}} se! Aapka Rs. {{4}} ka loan offer completely approved hai 🎉\n\nBas ek aakhri choti si step baaki hai: Please verify your {{5}} so we can process your disbursal quickly 💸\n\nNiche diye gaye link par click karein aur apna application 2 minute mein poora karein 👇"
- **Variable Mapping:**
  - `{{1}}`: Applicant's First Name
  - `{{2}}`: Agent Name (e.g. "Neha")
  - `{{3}}`: Company Name (e.g. "ClickPe")
  - `{{4}}`: Loan Amount
  - `{{5}}`: Exact pending documents or steps (e.g. "Udyam and Electricity Bill")
- **Buttons (Strict Order):**
  1. URL Button: `Claim Reserved Funds 🚀` (URL suffix variable: `{{6}}` = `<mobile_number>&utm_source=muthoot_follow_up...`)
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
