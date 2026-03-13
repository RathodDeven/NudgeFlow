ALTER TABLE "policy_states" ADD COLUMN "last_attempt_at" timestamp with time zone;

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
  "due_at" timestamp with time zone NOT NULL,
  "status" text NOT NULL,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "idempotency_key" text NOT NULL,
  "last_error" text,
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

ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "interaction_events" ADD CONSTRAINT "interaction_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "call_attempts" ADD CONSTRAINT "call_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "call_attempts" ADD CONSTRAINT "call_attempts_interaction_event_id_fkey" FOREIGN KEY ("interaction_event_id") REFERENCES "interaction_events"("id");
ALTER TABLE "scheduled_actions" ADD CONSTRAINT "scheduled_actions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
ALTER TABLE "policy_events" ADD CONSTRAINT "policy_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id");
