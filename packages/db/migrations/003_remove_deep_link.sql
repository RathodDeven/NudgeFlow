-- Migration: Remove deep_link from loan_cases
-- Description: Drops the unused deep_link column.

ALTER TABLE "loan_cases" DROP COLUMN IF EXISTS "deep_link";
