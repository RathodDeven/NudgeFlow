CREATE SCHEMA "public";
CREATE TABLE "conversation_sessions" (
	"id" uuid PRIMARY KEY,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"loan_case_id" uuid NOT NULL,
	"is_agent_active" boolean DEFAULT true NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"summary_state" jsonb NOT NULL,
	"compact_facts" jsonb DEFAULT '{}' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"token_estimate" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "loan_cases" (
	"id" uuid PRIMARY KEY,
	"tenant_id" uuid NOT NULL UNIQUE,
	"user_id" uuid NOT NULL,
	"partner_case_id" text NOT NULL UNIQUE,
	"current_stage" text NOT NULL,
	"loan_amount" numeric(12, 2),
	"firm_name" text,
	"is_reactivated" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"application_created_at" timestamp with time zone,
	"application_updated_at" timestamp with time zone,
	CONSTRAINT "loan_cases_tenant_id_partner_case_id_key" UNIQUE("tenant_id","partner_case_id")
);
CREATE TABLE "message_events" (
	"id" uuid PRIMARY KEY,
	"session_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"direction" text NOT NULL,
	"provider_message_id" text,
	"body" text NOT NULL,
	"language" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "policy_states" (
	"session_id" uuid PRIMARY KEY,
	"blocked" boolean DEFAULT false NOT NULL,
	"opted_out" boolean DEFAULT false NOT NULL,
	"non_responsive" boolean DEFAULT false NOT NULL,
	"attempts_in_window" integer DEFAULT 0 NOT NULL,
	"window_start_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone
);
CREATE TABLE "agent_decisions" (
	"id" uuid PRIMARY KEY,
	"session_id" uuid NOT NULL,
	"trigger" text NOT NULL,
	"route" text NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"guardrail_notes" jsonb DEFAULT '[]' NOT NULL,
	"suggested_next_followup_at" timestamp with time zone,
	"model_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "interaction_events" (
	"id" uuid PRIMARY KEY,
	"session_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"direction" text NOT NULL,
	"event_type" text NOT NULL,
	"transcript" text,
	"summary" text,
	"call_disposition" text,
	"call_duration_seconds" integer,
	"consent_flag" boolean,
	"handoff_flag" boolean,
	"provider_id" text,
	"provider_timestamp" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "call_attempts" (
	"id" uuid PRIMARY KEY,
	"session_id" uuid NOT NULL,
	"interaction_event_id" uuid NOT NULL,
	"disposition" text,
	"duration_seconds" integer,
	"provider_call_id" text,
	"provider_timestamp" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "scheduled_actions" (
	"id" uuid PRIMARY KEY,
	"session_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"action_subtype" text,
	"due_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text NOT NULL,
	"last_error" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "policy_events" (
	"id" uuid PRIMARY KEY,
	"session_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"reason_codes" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY,
	"key" text NOT NULL CONSTRAINT "tenants_key_key" UNIQUE,
	"display_name" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"knowledge_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY,
	"tenant_id" uuid NOT NULL UNIQUE,
	"external_user_id" text NOT NULL UNIQUE,
	"full_name" text,
	"phone_e164" text NOT NULL,
	"locale_hint" text,
	"city" text,
	"state" text,
	"consent_provided" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_tenant_id_external_user_id_key" UNIQUE("tenant_id","external_user_id")
);
CREATE UNIQUE INDEX "conversation_sessions_pkey" ON "conversation_sessions" ("id");
CREATE UNIQUE INDEX "loan_cases_pkey" ON "loan_cases" ("id");
CREATE UNIQUE INDEX "loan_cases_tenant_id_partner_case_id_key" ON "loan_cases" ("tenant_id","partner_case_id");
CREATE UNIQUE INDEX "message_events_pkey" ON "message_events" ("id");
CREATE UNIQUE INDEX "agent_decisions_pkey" ON "agent_decisions" ("id");
CREATE INDEX "agent_decisions_session_id_idx" ON "agent_decisions" ("session_id");
CREATE UNIQUE INDEX "interaction_events_pkey" ON "interaction_events" ("id");
CREATE INDEX "interaction_events_session_id_idx" ON "interaction_events" ("session_id");
CREATE UNIQUE INDEX "call_attempts_pkey" ON "call_attempts" ("id");
CREATE INDEX "call_attempts_session_id_idx" ON "call_attempts" ("session_id");
CREATE INDEX "call_attempts_interaction_id_idx" ON "call_attempts" ("interaction_event_id");
CREATE UNIQUE INDEX "scheduled_actions_pkey" ON "scheduled_actions" ("id");
CREATE UNIQUE INDEX "scheduled_actions_idempotency_key_key" ON "scheduled_actions" ("idempotency_key");
CREATE INDEX "scheduled_actions_due_status_idx" ON "scheduled_actions" ("status", "due_at");
CREATE INDEX "scheduled_actions_session_id_idx" ON "scheduled_actions" ("session_id");
CREATE UNIQUE INDEX "policy_events_pkey" ON "policy_events" ("id");
CREATE INDEX "policy_events_session_id_idx" ON "policy_events" ("session_id");
CREATE UNIQUE INDEX "policy_states_pkey" ON "policy_states" ("session_id");
CREATE UNIQUE INDEX "tenants_key_key" ON "tenants" ("key");
CREATE UNIQUE INDEX "tenants_pkey" ON "tenants" ("id");
CREATE UNIQUE INDEX "user_profiles_pkey" ON "user_profiles" ("id");
CREATE UNIQUE INDEX "user_profiles_tenant_id_external_user_id_key" ON "user_profiles" ("tenant_id","external_user_id");
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_loan_case_id_fkey" FOREIGN KEY ("loan_case_id") REFERENCES "loan_cases"("id");
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id");
ALTER TABLE "loan_cases" ADD CONSTRAINT "loan_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "loan_cases" ADD CONSTRAINT "loan_cases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id");
ALTER TABLE "message_events" ADD CONSTRAINT "message_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "interaction_events" ADD CONSTRAINT "interaction_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "call_attempts" ADD CONSTRAINT "call_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "call_attempts" ADD CONSTRAINT "call_attempts_interaction_event_id_fkey" FOREIGN KEY ("interaction_event_id") REFERENCES "interaction_events"("id");
ALTER TABLE "scheduled_actions" ADD CONSTRAINT "scheduled_actions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "policy_events" ADD CONSTRAINT "policy_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "policy_states" ADD CONSTRAINT "policy_states_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
