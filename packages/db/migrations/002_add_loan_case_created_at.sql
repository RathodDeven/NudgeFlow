-- Migration: 002_add_loan_case_created_at
-- Adds created_at to loan_cases to track original application date from source data.

ALTER TABLE "loan_cases" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
