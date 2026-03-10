-- Migration: Simplify Schema
-- Description: Drop unnecessary tables to focus on core user and conversation logic.

-- Drop unnecessary constraint-heavy tables first
DROP TABLE IF EXISTS "consent_records";
DROP TABLE IF EXISTS "dropoff_events";
DROP TABLE IF EXISTS "followup_tasks";
DROP TABLE IF EXISTS "handoff_events";
DROP TABLE IF EXISTS "status_poll_results";
DROP TABLE IF EXISTS "experiment_assignments";

-- The core tables remaining are:
-- 1. tenants
-- 2. user_profiles
-- 3. loan_cases
-- 4. conversation_sessions
-- 5. message_events
-- 6. policy_states
