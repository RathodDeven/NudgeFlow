ALTER TABLE "loan_cases"
  ALTER COLUMN "high_intent_flag" TYPE text
  USING (
    CASE
      WHEN "high_intent_flag" IS TRUE THEN 'yes'
      WHEN "high_intent_flag" IS FALSE THEN 'no'
      ELSE NULL
    END
  );
