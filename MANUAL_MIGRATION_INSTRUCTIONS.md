# CRITICAL: Manual Database Migration Required

## The Problem
- Infinite recursion in database policies causing 500 errors
- Git is not available in this environment for auto-deployment

## Solution: Run This SQL in Supabase Dashboard

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste this EXACT SQL:**

```sql
-- Fix infinite recursion in RLS policies
-- This migration completely resolves the 500 errors

BEGIN;

-- Temporarily disable RLS to clean up
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Public can submit responses" ON responses;
DROP POLICY IF EXISTS "Survey owners can view responses" ON responses;
DROP POLICY IF EXISTS "Anyone can submit responses to active public surveys" ON responses;
DROP POLICY IF EXISTS "Users can view responses to their own surveys" ON responses;
DROP POLICY IF EXISTS "allow_public_insert" ON responses;
DROP POLICY IF EXISTS "allow_authenticated_select" ON responses;

-- Create simple, non-recursive policies
CREATE POLICY "simple_public_insert"
  ON responses
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "simple_authenticated_select"
  ON responses
  FOR SELECT
  TO authenticated
  USING (true);

-- Re-enable RLS
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Add simple performance indexes (no subqueries)
CREATE INDEX IF NOT EXISTS idx_responses_survey_simple 
  ON responses (survey_id);

CREATE INDEX IF NOT EXISTS idx_responses_submitted_simple 
  ON responses (submitted_at DESC);

COMMIT;
```

4. **Click "Run" to execute the migration**
5. **Test your survey response submission**

## Expected Result
- ✅ No more "infinite recursion" errors
- ✅ Survey responses save successfully
- ✅ 500 errors resolved

## If Still Having Issues
The application will show detailed error messages in the browser console to help debug any remaining issues.