-- Add emi_amount column to loan_cases
ALTER TABLE "loan_cases" ADD COLUMN "emi_amount" numeric(12, 2);
