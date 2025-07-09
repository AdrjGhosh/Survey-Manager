/*
# Add User Ownership to Surveys

1. Schema Changes
   - Add `user_id` column to surveys table
   - Add `user_id` column to responses table for tracking (optional)
   - Update indexes for performance

2. Security Updates
   - Update RLS policies to enforce user ownership
   - Ensure users can only access their own surveys
   - Maintain public access for survey responses

3. Data Migration
   - Existing surveys will need user assignment (handled gracefully)
*/

-- Add user_id column to surveys table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surveys' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE surveys ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id column to responses table (for analytics and ownership tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'responses' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE responses ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Public surveys are viewable by everyone" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can manage their surveys" ON surveys;
DROP POLICY IF EXISTS "Anyone can submit responses to active public surveys" ON responses;
DROP POLICY IF EXISTS "Authenticated users can view all responses" ON responses;

-- Updated policies for surveys table
CREATE POLICY "Public surveys are viewable by everyone"
  ON surveys
  FOR SELECT
  USING (is_active = true AND allow_public_access = true);

CREATE POLICY "Users can manage their own surveys"
  ON surveys
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated policies for responses table
CREATE POLICY "Anyone can submit responses to active public surveys"
  ON responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = responses.survey_id 
      AND surveys.is_active = true 
      AND surveys.allow_public_access = true
      AND (surveys.expires_at IS NULL OR surveys.expires_at > now())
      AND (surveys.response_limit IS NULL OR (
        SELECT COUNT(*) FROM responses r2 
        WHERE r2.survey_id = responses.survey_id
      ) < surveys.response_limit)
    )
  );

CREATE POLICY "Users can view responses to their own surveys"
  ON responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = responses.survey_id 
      AND surveys.user_id = auth.uid()
    )
  );

-- Function to automatically set user_id on survey creation
CREATE OR REPLACE FUNCTION set_survey_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically set user_id
DROP TRIGGER IF EXISTS set_survey_user_id_trigger ON surveys;
CREATE TRIGGER set_survey_user_id_trigger
  BEFORE INSERT ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION set_survey_user_id();

-- Function to set response user_id (for analytics)
CREATE OR REPLACE FUNCTION set_response_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Set user_id from the survey owner for analytics purposes
  SELECT user_id INTO NEW.user_id 
  FROM surveys 
  WHERE id = NEW.survey_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set response user_id
DROP TRIGGER IF EXISTS set_response_user_id_trigger ON responses;
CREATE TRIGGER set_response_user_id_trigger
  BEFORE INSERT ON responses
  FOR EACH ROW
  EXECUTE FUNCTION set_response_user_id();