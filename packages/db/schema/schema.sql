CREATE SCHEMA IF NOT EXISTS "public";

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
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
	"external_user_id" text NOT NULL,
	"full_name" text,
	"phone_e164" text NOT NULL,
	"locale_hint" text,
	"city" text,
	"state" text,
	"consent_provided" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_tenant_id_external_user_id_key" UNIQUE("tenant_id","external_user_id")
);

CREATE TABLE "loan_cases" (
	"id" uuid PRIMARY KEY,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
	"user_id" uuid NOT NULL REFERENCES "user_profiles"("id"),
	"partner_case_id" text NOT NULL,
	"current_stage" text NOT NULL,
	"loan_amount" numeric(12, 2),
	"firm_name" text,
	"is_reactivated" boolean DEFAULT false NOT NULL,
	"deep_link" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_cases_tenant_id_partner_case_id_key" UNIQUE("tenant_id","partner_case_id")
);

CREATE TABLE "conversation_sessions" (
	"id" uuid PRIMARY KEY,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
	"user_id" uuid NOT NULL REFERENCES "user_profiles"("id"),
	"loan_case_id" uuid NOT NULL REFERENCES "loan_cases"("id"),
	"is_agent_active" boolean DEFAULT true NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"summary_state" jsonb NOT NULL,
	"compact_facts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"token_estimate" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "message_events" (
	"id" uuid PRIMARY KEY,
	"session_id" uuid NOT NULL REFERENCES "conversation_sessions"("id"),
	"channel" text NOT NULL,
	"direction" text NOT NULL,
	"provider_message_id" text,
	"body" text NOT NULL,
	"language" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "policy_states" (
	"session_id" uuid PRIMARY KEY REFERENCES "conversation_sessions"("id"),
	"blocked" boolean DEFAULT false NOT NULL,
	"opted_out" boolean DEFAULT false NOT NULL,
	"non_responsive" boolean DEFAULT false NOT NULL,
	"attempts_in_window" integer DEFAULT 0 NOT NULL,
	"window_start_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indices for performance
CREATE INDEX "idx_user_profiles_tenant_id" ON "user_profiles" ("tenant_id");
CREATE INDEX "idx_loan_cases_user_id" ON "loan_cases" ("user_id");
CREATE INDEX "idx_conversation_sessions_user_id" ON "conversation_sessions" ("user_id");
CREATE INDEX "idx_message_events_session_id" ON "message_events" ("session_id");