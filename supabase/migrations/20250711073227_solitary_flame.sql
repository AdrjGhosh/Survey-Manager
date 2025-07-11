/*
  # Fix Response Submission Issues

  1. Ensure proper RLS policies for public response submission
  2. Fix any missing constraints or triggers
  3. Add better error handling for response insertion
*/

-- Ensure the responses table allows public insertions for active surveys
DROP POLICY IF EXISTS "Anyone can submit responses to active public surveys" ON responses;

CREATE POLICY "Anyone can submit responses to active public surveys"
  ON responses
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = responses.survey_id 
        AND surveys.is_active = true 
        AND surveys.allow_public_access = true
        AND (surveys.expires_at IS NULL OR surveys.expires_at > now())
        AND (surveys.response_limit IS NULL OR 
             (SELECT count(*) FROM responses r2 WHERE r2.survey_id = responses.survey_id) < surveys.response_limit)
    )
  );

-- Ensure the trigger function exists and works properly
CREATE OR REPLACE FUNCTION set_response_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set user_id if user is authenticated, otherwise leave it NULL for public responses
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS set_response_user_id_trigger ON responses;
CREATE TRIGGER set_response_user_id_trigger
  BEFORE INSERT ON responses
  FOR EACH ROW
  EXECUTE FUNCTION set_response_user_id();

-- Add an index for better performance on response queries
CREATE INDEX IF NOT EXISTS idx_responses_survey_submitted 
  ON responses(survey_id, submitted_at DESC);