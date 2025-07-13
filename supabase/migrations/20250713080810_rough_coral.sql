/*
  # Fix Supabase Performance Warnings

  This migration addresses all performance warnings:
  1. Optimizes RLS policies to avoid re-evaluation of auth functions
  2. Consolidates multiple permissive policies 
  3. Removes duplicate indexes
  4. Maintains all functionality while improving performance
*/

-- Fix RLS performance issues by optimizing auth function calls
DROP POLICY IF EXISTS "Users can manage their own surveys" ON surveys;
DROP POLICY IF EXISTS "Public surveys are viewable by everyone" ON surveys;

-- Create single optimized policy for surveys
CREATE POLICY "Optimized survey access"
  ON surveys
  FOR ALL
  TO authenticated
  USING (
    -- Use subquery to evaluate auth.uid() only once
    user_id = (SELECT auth.uid())
    OR 
    (is_active = true AND allow_public_access = true)
  )
  WITH CHECK (
    -- Use subquery to evaluate auth.uid() only once  
    user_id = (SELECT auth.uid())
  );

-- Keep simple public policy for viewing active public surveys
CREATE POLICY "Public can view active surveys"
  ON surveys
  FOR SELECT
  TO public
  USING (is_active = true AND allow_public_access = true);

-- Remove duplicate indexes on responses table
DROP INDEX IF EXISTS idx_responses_submitted_at;
DROP INDEX IF EXISTS idx_responses_submitted_at_simple;
DROP INDEX IF EXISTS idx_responses_survey_id;
DROP INDEX IF EXISTS idx_responses_survey_id_simple;
DROP INDEX IF EXISTS idx_responses_survey_simple;
DROP INDEX IF EXISTS idx_responses_survey_submitted;

-- Create single optimized indexes
CREATE INDEX IF NOT EXISTS idx_responses_survey_optimized 
  ON responses (survey_id);

CREATE INDEX IF NOT EXISTS idx_responses_submitted_optimized 
  ON responses (submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_responses_survey_submitted_optimized 
  ON responses (survey_id, submitted_at DESC);

-- Ensure RLS is enabled
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;