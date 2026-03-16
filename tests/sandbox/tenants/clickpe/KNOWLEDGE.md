# ClickPe MSME Loan Journey  
AI Agent Process Guide

## 1. Workflow Overview

```

Login / OTP
→ PAN
→ Personal Details
→ Email OTP
→ Udyam
→ Business Details
→ Offer
→ Accept Offer
= Fresh Loan

Fresh Loan
→ Document Upload
→ Loan Detail Submitted
→ DigiLocker / KYC / Selfie / Shop Photo
→ Under Review
→ VKYC / VPD
→ Credit Decisioning
→ Approval
→ Disbursal

```

### Offer Stage Branch

| Branch | Meaning | Documents / Next Step |
|---|---|---|
| **Fresh Loan** | User accepts regular offer and does not move to Boost Offer | Proceed to standard document upload |
| **Boost Offer** | Alternative upgraded offer path | May require GST return or bank statement |

---

# 2. Stage-by-Stage Process

## Stage 1 — Journey Start

User logs in and completes OTP verification.

**Steps**
- Login
- OTP verification

**Purpose**
- Entry point into the loan funnel.
- First conversion checkpoint.

**Next State**
```

PAN Step

```

---

## Stage 2 — Profile and Basic Details

User completes the core profile creation sequence.

**Steps**

- PAN
- Personal details
- Email OTP
- Udyam details
- Business details

**Next State**

```

Offer Stage

```

---

## Stage 3 — Offer Shown

Loan offer is displayed after profile completion.

**User Options**

- Accept the main offer
- Move to Boost Offer

**Boost Offer Requirement**

- GST return
- Bank statement

**Next State**

```

Fresh Loan

```

---

## Stage 4 — Fresh Loan

User has accepted the offer and remained on the standard path.

**Key Notes**

- Users in this dataset are already in the **Fresh Loan** state.
- Offer acceptance is already completed.

**Next State**

```

Document Upload

```

---

## Stage 5 — Document Upload

First set of supporting documents are uploaded.

**Required Documents**

- Udyam Card
- Electricity Bill

**Special Rule**

If electricity bill **is not in applicant’s name**

Required fallback documents:

- Relationship proof
- Father's Aadhaar card

**Next State**

```

Loan Detail Submitted

```

---

## Stage 6 — Loan Detail Submitted

User has submitted base documents.

Digital verification steps must now be completed.

**Required Digital Checks**

- DigiLocker
- Aadhaar KYC
- Selfie verification
- Shop stock photo

**Next State**

```

Under Review

```

---

## Stage 7 — Under Review

Application is under verification.

**Required Steps**

- VKYC completion
- VPD completion

**Additional Checks**

- PAN validation
- Business validation

**Next State**

```

Credit Decisioning

```

---

## Stage 8 — Credit Decisioning

Final lender review stage.

**Possible Outcomes**

- Query
- Approval
- Rejection

If verification and review are satisfactory:

```

Approval
→ Disbursal

```

---

# 3. Required Documents and Verification

| Stage | Requirement | Important Rule |
|---|---|---|
| Boost Offer | GST return or bank statement | Required only if Boost Offer path selected |
| Fresh Loan Documents | Udyam card + electricity bill | Electricity bill ownership must match applicant |
| Electricity Bill Exception | Relationship proof + father's Aadhaar | Required if bill not in applicant name |
| Digital Verification | DigiLocker, Aadhaar KYC, selfie verification, shop photo | Must complete before full review |

---

# 4. AI Agent Status Definitions

| Status | Meaning | AI Agent Action | Next State |
|---|---|---|---|
| Journey Started | User entered funnel but profile incomplete | Push OTP, PAN, personal and business steps | Offer |
| Offer | Loan offer displayed | Encourage offer acceptance or clarify branch | Fresh Loan / Boost Offer |
| Fresh Loan | Offer accepted on standard path | Push document upload | Loan Detail Submitted |
| Loan Detail Submitted | Initial documents uploaded | Push DigiLocker, KYC, selfie, shop photo | Under Review |
| Under Review | Digital checks done, review in progress | Push VKYC and VPD completion | Credit Decisioning |
| Credit Decisioning | Final lender assessment | Resolve queries, monitor outcome | Approval / Reject |
| Approved | Loan sanctioned | Assist with disbursal communication | Disbursal |

---

# 5. Critical Rules for AI Agent

- **Fresh Loan users have already accepted the offer.**  
  Do not attempt offer persuasion.

- **Fresh Loan path does NOT normally require GST return or bank statement.**

- **Electricity bill ownership matters.**  
  If mismatch:
  - Collect relationship proof
  - Collect father's Aadhaar

- **Loan Detail Submitted is NOT review-ready.**  
  Still pending:
  - DigiLocker
  - KYC
  - Selfie verification
  - Shop photo

- **Under Review ≠ Approval**

  Still requires:

  - VKYC
  - VPD
  - Lender review

- **Credit Decisioning outcomes**
  - Query
  - Approval
  - Rejection

---

# 6. AI Agent Intervention Points

### After Offer Acceptance (Fresh Loan)
Guide user on required document uploads.

### During Document Upload
Clarify:

- Udyam card requirement
- Electricity bill requirement
- Relationship proof fallback rule

### At Loan Detail Submitted
Drive completion of:

- DigiLocker
- Aadhaar KYC
- Selfie verification
- Shop photo upload

### At Under Review
Prepare user for:

- VKYC
- VPD

### At Credit Decisioning
Resolve lender queries quickly and keep the user informed.

---

# One-Line Summary

A **Fresh Loan user is already post-offer-acceptance** and must be guided through **document upload → digital verification → review → credit decisioning → disbursal**.
