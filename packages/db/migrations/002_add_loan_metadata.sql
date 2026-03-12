-- Migration: Add metadata column to loan_cases
-- Description: Adds a JSONB metadata column to store rich loan details from CSV ingestion.

ALTER TABLE "loan_cases" ADD COLUMN "metadata" jsonb DEFAULT '{}' NOT NULL;
