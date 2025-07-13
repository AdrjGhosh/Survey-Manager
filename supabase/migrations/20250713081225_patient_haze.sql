/*
  # Clean up performance issues

  1. Policy Consolidation
    - Remove multiple permissive policies on surveys table
    - Create single optimized policy for authenticated users
    - Keep separate public policy for unauthenticated access

  2. Index Cleanup
    - Remove all duplicate and unused indexes
    - Keep only essential indexes for performance
    - Optimize for actual query patterns
*/

-- Step 1: Fix multiple permissive policies on surveys
DROP POLICY IF EXISTS "Optimized survey access" ON surveys;
DROP POLICY IF EXISTS "Public can view active surveys" ON surveys;

-- Create single consolidated policy for authenticated users
CREATE POLICY "Authenticated users can access surveys"
  ON surveys
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR 
    (is_active = true AND allow_public_access = true)
  );

-- Keep separate policy for public (unauthenticated) access
CREATE POLICY "Public can view active surveys"
  ON surveys
  FOR SELECT
  TO public
  USING (is_active = true AND allow_public_access = true);

-- Step 2: Clean up all duplicate and unused indexes on responses
DROP INDEX IF EXISTS idx_responses_submitted_optimized;
DROP INDEX IF EXISTS idx_responses_submitted_simple;
DROP INDEX IF EXISTS idx_responses_user_id;
DROP INDEX IF EXISTS idx_responses_survey_optimized;
DROP INDEX IF EXISTS idx_responses_survey_submitted_optimized;

-- Keep only essential indexes that are actually used
CREATE INDEX IF NOT EXISTS idx_responses_survey_id 
  ON responses (survey_id);

CREATE INDEX IF NOT EXISTS idx_responses_submitted_at 
  ON responses (submitted_at DESC);

-- Step 3: Verify RLS is enabled
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;