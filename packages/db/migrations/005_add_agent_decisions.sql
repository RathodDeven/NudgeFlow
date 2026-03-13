-- Migration: Add agent_decisions table
-- Description: Stores structured decision outputs from agent-runtime for admin timeline inspection.

CREATE TABLE IF NOT EXISTS "agent_decisions" (
  "id" uuid PRIMARY KEY,
  "session_id" uuid NOT NULL,
  "trigger" text NOT NULL,
  "route" text NOT NULL,
  "confidence" numeric(4, 3) NOT NULL,
  "guardrail_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "suggested_next_followup_at" timestamp with time zone,
  "model_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "agent_decisions_session_id_fkey"
    FOREIGN KEY ("session_id")
    REFERENCES "conversation_sessions"("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_decisions_session_created_idx"
  ON "agent_decisions" ("session_id", "created_at" DESC);
