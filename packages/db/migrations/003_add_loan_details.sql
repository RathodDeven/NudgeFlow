-- Migration: 003_add_loan_details.sql
-- Description: Add tenure_months, annual_interest_rate, and processing_fee to loan_cases.

ALTER TABLE "loan_cases" ADD COLUMN "tenure_months" integer;
ALTER TABLE "loan_cases" ADD COLUMN "annual_interest_rate" numeric(5, 2);
ALTER TABLE "loan_cases" ADD COLUMN "processing_fee" numeric(12, 2);
