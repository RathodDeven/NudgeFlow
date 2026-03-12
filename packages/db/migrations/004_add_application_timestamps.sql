-- Migration: Add dedicated application timestamps to loan_cases
ALTER TABLE "loan_cases" ADD COLUMN "application_created_at" timestamp with time zone;
ALTER TABLE "loan_cases" ADD COLUMN "application_updated_at" timestamp with time zone;
