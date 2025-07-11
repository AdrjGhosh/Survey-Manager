/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - RLS policy for responses table has infinite recursion
    - Policy is calling itself when checking permissions
    - This causes 500 errors when submitting responses

  2. Solution
    - Drop existing problematic policies
    - Create new, simple policies without recursion
    - Allow public INSERT for active surveys
    - Allow users to SELECT their own survey responses

  3. Security
    - Public can only INSERT responses to active, public surveys
    - Users can only SELECT responses to surveys they own
    - No UPDATE or DELETE allowed for responses
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Anyone can submit responses to active public surveys" ON responses;
DROP POLICY IF EXISTS "Users can view responses to their own surveys" ON responses;

-- Create new, non-recursive policies
CREATE POLICY "Public can submit responses"
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
    )
  );

CREATE POLICY "Survey owners can view responses"
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

-- Ensure RLS is enabled
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_responses_survey_active 
ON responses (survey_id) 
WHERE survey_id IN (
  SELECT id FROM surveys 
  WHERE is_active = true AND allow_public_access = true
);