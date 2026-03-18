-- Migration to remove call_summary_short from JSONB fields in loan_cases
UPDATE "loan_cases"
SET 
  inference_extracted_data = inference_extracted_data - 'call_summary_short',
  metadata = jsonb_set(
    metadata, 
    '{call_inference}', 
    (metadata->'call_inference') - 'call_summary_short'
  )
WHERE 
  inference_extracted_data ? 'call_summary_short'
  OR (metadata ? 'call_inference' AND (metadata->'call_inference') ? 'call_summary_short');
