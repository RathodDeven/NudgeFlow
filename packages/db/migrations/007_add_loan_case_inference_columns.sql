ALTER TABLE "loan_cases"
  ADD COLUMN "last_call_at" timestamp with time zone,
  ADD COLUMN "last_call_disposition" text,
  ADD COLUMN "inferred_intent" text,
  ADD COLUMN "high_intent_flag" boolean,
  ADD COLUMN "follow_up_at" timestamp with time zone,
  ADD COLUMN "call_summary_latest" text,
  ADD COLUMN "call_notes_latest" text,
  ADD COLUMN "inference_extracted_data" jsonb DEFAULT '{}' NOT NULL,
  ADD COLUMN "inference_context_details" jsonb DEFAULT '{}' NOT NULL,
  ADD COLUMN "last_bolna_execution_id" text,
  ADD COLUMN "last_bolna_batch_id" text,
  ADD COLUMN "last_call_recording_url" text;

CREATE INDEX "loan_cases_tenant_inferred_intent_idx"
  ON "loan_cases" ("tenant_id", "inferred_intent", "last_call_at" DESC);

CREATE INDEX "loan_cases_tenant_high_intent_idx"
  ON "loan_cases" ("tenant_id", "high_intent_flag", "follow_up_at");
