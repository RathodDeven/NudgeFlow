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
	"window_start_at" timestamp with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "policy_states" ADD CONSTRAINT "policy_states_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");