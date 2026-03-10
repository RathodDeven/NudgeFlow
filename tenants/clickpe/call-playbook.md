---
name: call-playbook
description: Manual call escalation framework for ClickPe Fresh Loan pilot — trigger conditions, priority matrix, scripts per stage.
---

## Purpose
Manual calls are the rescue channel. WhatsApp is default. Calls are used ONLY when WhatsApp cannot resolve a blocker.

## Call Priority Matrix

| Priority | Condition | Action timing (Golden Window) |
|---|---|---|
| **P1** | User explicitly requests a call | Call immediately |
| **P1** | Bill mismatch / technical issue reported | Call same day (prefer 2:00 PM - 4:00 PM) |
| **P1** | Under Review with VKYC/VPD pending | Call same day (prefer 2:00 PM - 4:00 PM) |
| **P2** | No stage movement after 24 hours | Call next available block (10:00 AM or 2:00 PM) |
| **P2** | Confused user (repeated unclear replies) | Call next available block |
| **P3** | User said "busy" with a promised follow-up time | Call exactly at promised time |

## General Call Framework

| Step | Script Template | Purpose |
|---|---|---|
| **Open** | "Hello {{name}}, calling from ClickPe regarding your loan. Good time for 2 minutes?" | Permission |
| **Confirm Stage** | "Your pending step is {{pending_step}}" | Context |
| **Ask Blocker** | "What is stopping you from completing this today?" | Diagnosis |
| **Resolve Blocker** | Solve only the current issue, nothing extra | Focus |
| **Secure Commitment** | "Can you do this now, afternoon, or tonight?" | Action |
| **Close** | Recap the exact next step | Clear plan |

## Stage-Specific Call Scripts

### Fresh Loan
- **Context:** "Namaste, I see your ₹{{loan_amount}} offer is approved and reserved, but the application is paused." *(Loss Aversion)*
- **Requirement:** "We just need your Udyam card and electricity bill uploaded to release the funds."
- **Fallback:** "If the electricity bill is not in your name, we just need relationship proof and your father's Aadhaar. It takes 2 minutes."
- **Commitment:** "Can you upload this now, or would tonight between 7-9 PM be better?"

### Loan Detail Submitted
- **Context:** "Your documents are submitted. Next step is digital verification."
- **Diagnosis:** "Are you stuck on OTP, DigiLocker login, selfie upload, or shop photo?"
- **Commitment:** "If I send the link now, can you complete it today?"

### Under Review
- **Context:** "Your application is under review but the process is not finished. There are pending steps."
- **Next Step:** "You need to complete VKYC / VPD / respond to the clarification request."
- **Reassurance:** "This call is to prevent the case from getting stuck. We want to keep it moving."

## Call Trigger Conditions by Stage

### Fresh Loan → Call When:
- Bill mismatch reported
- Confusion about documents
- User requests call
- No movement next day

### Loan Detail Submitted → Call When:
- OTP issue
- DigiLocker issue
- Selfie upload failure
- Technical problem
- No movement next day

### Under Review → Call When:
- VKYC pending
- VPD pending
- Lender query raised
- User anxious
- No movement

## What NOT To Do on Calls
- Do not call everyone — calls are for rescue only
- Do not discuss unrelated topics
- Do not promise approval or timelines
- Do not ask for GST returns or bank statements
- Do not request extra personal data beyond what's needed
