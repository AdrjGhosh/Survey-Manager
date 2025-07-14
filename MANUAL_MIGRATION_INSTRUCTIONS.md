# CRITICAL: Manual Database Migration Required

## The Problem
- Row Level Security (RLS) policy violations on 'surveys' table
- Authenticated users cannot save, update, or manage their own surveys
- Errors: "new row violates row-level security policy for table 'surveys'"

## Solution: Run This SQL in Supabase Dashboard

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste this EXACT SQL:**

```sql
-- Fix RLS policies for surveys table
-- This migration resolves permission denied errors for authenticated users

BEGIN;

-- Enable RLS on the surveys table
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Users can view their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can create their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can update their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can manage their own surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can access surveys" ON surveys;
DROP POLICY IF EXISTS "Public can view active surveys" ON surveys;
DROP POLICY IF EXISTS "Public can view active public surveys" ON surveys;
DROP POLICY IF EXISTS "Optimized survey access" ON surveys;

-- Create comprehensive policies for authenticated users
-- Policy for SELECT: Users can view their own surveys + public surveys
CREATE POLICY "Users can view surveys"
  ON surveys
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id OR 
    (is_active = true AND allow_public_access = true)
  );

-- Policy for INSERT: Users can create surveys for themselves
CREATE POLICY "Users can create surveys"
  ON surveys
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy for UPDATE: Users can update their own surveys
CREATE POLICY "Users can update surveys"
  ON surveys
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy for DELETE: Users can delete their own surveys
CREATE POLICY "Users can delete surveys"
  ON surveys
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Policy for anonymous users to view public surveys only
CREATE POLICY "Anonymous can view public surveys"
  ON surveys
  FOR SELECT
  TO anon
  USING (is_active = true AND allow_public_access = true);

COMMIT;
```

4. **Click "Run" to execute the migration**
5. **Test your survey creation and editing**

## Expected Result
- ✅ No more "row-level security policy" violations
- ✅ Authenticated users can create, edit, and delete their own surveys
- ✅ Users can view public surveys from other users
- ✅ Anonymous users can view public surveys (read-only)

## If Still Having Issues
Check the browser console for any remaining authentication errors and ensure you are properly signed in.