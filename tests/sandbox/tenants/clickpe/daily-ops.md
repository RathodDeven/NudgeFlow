---
name: daily-ops
description: Daily execution loop, tracker fields, blocker codes, and pilot metrics for ClickPe Fresh Loan pilot.
---

## Daily Execution Loop

| Time Block | Action | Output |
|---|---|---|
| **Morning** | Import new status sheet, compare with yesterday | Movement status per user |
| **Morning** | Bucket unchanged users by stage | Stage-grouped lists |
| **Late Morning** | Send stage-specific WhatsApp message to each bucket | First touch of the day |
| **Afternoon** | Read WhatsApp replies, tag blockers | Blocker codes assigned |
| **Evening** | Execute call rescue queue (P1 → P2 → P3) | Recovery attempts |
| **End of Day** | Update tracker, note learnings | Updated tracker |

## User Tags

After processing, each user gets one tag:

| Tag | Meaning |
|---|---|
| `moved` | Stage changed since yesterday |
| `unchanged` | No stage movement |
| `replied` | Responded on WhatsApp but hasn't moved |
| `needs_call` | Requires manual call escalation |

## Tracker Fields

Every user in the pilot must have these fields tracked:

| Field | Description |
|---|---|
| User ID | Unique identifier |
| Current Stage | One of: fresh_loan, loan_detail_submitted, under_review, credit_decisioning |
| Exact Pending Step | Specific action needed (e.g., "upload electricity bill") |
| Last WhatsApp Sent | Timestamp of last outbound message |
| Reply Status | replied / no_reply |
| Blocker Code | One of: confused, bill_mismatch, technical_issue, busy, completed |
| Call Done | yes / no |
| Call Priority | P1 / P2 / P3 / none |
| Next Promised Action Time | When user committed to act |

## Blocker Code Definitions

| Code | Meaning | Resolution Channel |
|---|---|---|
| `confused` | Doesn't understand what to do | WhatsApp first, then call |
| `bill_mismatch` | Electricity bill name doesn't match applicant | WhatsApp guidance, then call if still stuck |
| `technical_issue` | OTP, app error, DigiLocker, upload failure | Call same day |
| `busy` | User says will do later | Schedule callback at promised time |
| `completed` | User claims done but status unchanged | Verify against sheet, re-explain if still pending |

## Pilot Success Metrics

| Metric | How to Measure |
|---|---|
| **Stage Movement Rate** | % users who moved to next stage per day |
| **WhatsApp Response Rate** | % users who replied to WhatsApp message |
| **Call Rescue Rate** | % of called users who completed pending step |
| **Top Blocker Distribution** | Count of each blocker code |
| **Median Days Stuck** | Median days a user stays in same stage |

## Compliance Guardrails

- Use clear, simple language
- Ask only for required documents (Udyam + electricity bill or fallback set)
- KYC requires explicit user consent
- Agent does not make credit decisions — do not imply otherwise
- Follow RBI / DPDP digital lending guidelines
