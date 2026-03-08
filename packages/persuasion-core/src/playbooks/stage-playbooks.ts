import type { LoanStage } from '@nudges/domain'

export type NudgeStyle = 'progress' | 'help'

export type StagePlaybook = {
  stage: LoanStage
  objective: string
  progressTemplate: string
  helpTemplate: string
  ctaType: 'deep_link' | 'assisted'
}

const commonHelp = 'If you want, I can guide you step-by-step in this chat.'

export const stagePlaybooks: Record<LoanStage, StagePlaybook> = {
  login: {
    stage: 'login',
    objective: 'Restart application',
    progressTemplate: 'You are very close to restarting your loan application. Ready to continue now?',
    helpTemplate: `Need help logging in? ${commonHelp}`,
    ctaType: 'deep_link'
  },
  otp_verify: {
    stage: 'otp_verify',
    objective: 'Complete OTP verification',
    progressTemplate: 'One quick OTP verification and your application resumes.',
    helpTemplate: `If OTP is not coming, I can troubleshoot in 1 minute. ${commonHelp}`,
    ctaType: 'assisted'
  },
  pan: {
    stage: 'pan',
    objective: 'Validate PAN',
    progressTemplate: 'You are one step away. PAN verification can be completed quickly.',
    helpTemplate: `PAN mismatch happens often. I can help you fix it quickly. ${commonHelp}`,
    ctaType: 'assisted'
  },
  personal_details: {
    stage: 'personal_details',
    objective: 'Complete personal profile',
    progressTemplate: 'Your application is in progress. Just update your details to continue.',
    helpTemplate: `Want me to explain each field before you submit? ${commonHelp}`,
    ctaType: 'assisted'
  },
  email_otp: {
    stage: 'email_otp',
    objective: 'Verify email OTP',
    progressTemplate: 'Please verify your email OTP to unlock the next step.',
    helpTemplate: `I can help if the OTP mail is delayed or in spam. ${commonHelp}`,
    ctaType: 'assisted'
  },
  udyam: {
    stage: 'udyam',
    objective: 'Complete Udyam step',
    progressTemplate: 'Udyam step is pending. Finish this and move ahead immediately.',
    helpTemplate: `Udyam can feel complex. I can share a simple, local-language walkthrough. ${commonHelp}`,
    ctaType: 'assisted'
  },
  business_details: {
    stage: 'business_details',
    objective: 'Submit business details',
    progressTemplate: 'You are near completion. Add your business details to proceed.',
    helpTemplate: `I can help with business fields right now. ${commonHelp}`,
    ctaType: 'assisted'
  },
  offer: {
    stage: 'offer',
    objective: 'Review offer',
    progressTemplate: 'Your offer is ready to review. Take a look and continue today.',
    helpTemplate: `If any offer term is unclear, ask me and I will explain simply. ${commonHelp}`,
    ctaType: 'deep_link'
  },
  offer_accept: {
    stage: 'offer_accept',
    objective: 'Accept offer',
    progressTemplate: 'Your offer is waiting. Accept to move directly to disbursal steps.',
    helpTemplate: `I can clarify tenure, repayment, and charges before you accept. ${commonHelp}`,
    ctaType: 'deep_link'
  },
  fresh_loan: {
    stage: 'fresh_loan',
    objective: 'Proceed to loan setup',
    progressTemplate: 'Your loan setup is pending. One small step left to continue.',
    helpTemplate: `I can help finish this in one quick flow. ${commonHelp}`,
    ctaType: 'deep_link'
  },
  document_upload: {
    stage: 'document_upload',
    objective: 'Upload required documents',
    progressTemplate: 'Upload your documents and your application can move forward fast.',
    helpTemplate: `Document issue? I can help with file size, format, and upload steps. ${commonHelp}`,
    ctaType: 'assisted'
  },
  under_review: {
    stage: 'under_review',
    objective: 'Resolve review blocker',
    progressTemplate: 'Your application is under review. A quick response can speed things up.',
    helpTemplate: `I can check what is pending and guide you. ${commonHelp}`,
    ctaType: 'assisted'
  },
  vkyc: {
    stage: 'vkyc',
    objective: 'Complete VKYC',
    progressTemplate: 'Schedule your VKYC now. It usually takes only a few minutes.',
    helpTemplate: `I can help you pick a suitable VKYC time slot. ${commonHelp}`,
    ctaType: 'assisted'
  },
  vpd: {
    stage: 'vpd',
    objective: 'Finish VPD step',
    progressTemplate: 'Please complete VPD so your application can proceed.',
    helpTemplate: `Need help for VPD requirements? ${commonHelp}`,
    ctaType: 'assisted'
  },
  credit_decisioning: {
    stage: 'credit_decisioning',
    objective: 'Complete pending info for decision',
    progressTemplate: 'Your case is in final checks. Share pending info to speed up decision.',
    helpTemplate: `I can tell you exactly what is pending. ${commonHelp}`,
    ctaType: 'assisted'
  },
  boost_offer: {
    stage: 'boost_offer',
    objective: 'Complete boost-offer path',
    progressTemplate: 'You may unlock a better offer by completing the next step.',
    helpTemplate: `I can guide you through the boost-offer process. ${commonHelp}`,
    ctaType: 'assisted'
  },
  converted: {
    stage: 'converted',
    objective: 'No outreach',
    progressTemplate: '',
    helpTemplate: '',
    ctaType: 'deep_link'
  },
  inactive: {
    stage: 'inactive',
    objective: 'Stop outreach',
    progressTemplate: '',
    helpTemplate: '',
    ctaType: 'assisted'
  }
}
