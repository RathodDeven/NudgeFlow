ALTER TABLE "scheduled_actions" ADD COLUMN "action_subtype" text;
ALTER TABLE "scheduled_actions" ADD COLUMN "metadata" jsonb DEFAULT '{}' NOT NULL;
