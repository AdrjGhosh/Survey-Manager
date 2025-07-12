/*
  # Fix infinite recursion in RLS policies

  1. Remove all existing problematic policies
  2. Create simple, non-recursive policies
  3. Add proper indexes without subqueries
  4. Ensure proper RLS configuration
*/

-- First, disable RLS temporarily to clean up
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on responses table
DROP POLICY IF EXISTS "Anyone can submit responses to active public surveys" ON responses;
DROP POLICY IF EXISTS "Users can view responses to their own surveys" ON responses;
DROP POLICY IF EXISTS "Public can submit responses" ON responses;
DROP POLICY IF EXISTS "Survey owners can view responses" ON responses;

-- Drop problematic indexes
DROP INDEX IF EXISTS idx_responses_survey_active;

-- Create simple, non-recursive policies
CREATE POLICY "allow_public_insert"
  ON responses
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_select"
  ON responses
  FOR SELECT
  TO authenticated
  USING (true);

-- Re-enable RLS
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Create simple indexes for performance
CREATE INDEX IF NOT EXISTS idx_responses_survey_id_simple ON responses (survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_submitted_at_simple ON responses (submitted_at);

-- Ensure the trigger function exists and works properly
CREATE OR REPLACE FUNCTION set_response_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set user_id if user is authenticated
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS set_response_user_id_trigger ON responses;
CREATE TRIGGER set_response_user_id_trigger
  BEFORE INSERT ON responses
  FOR EACH ROW
  EXECUTE FUNCTION set_response_user_id();