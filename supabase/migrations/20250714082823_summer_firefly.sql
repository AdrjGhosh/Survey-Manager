/*
  # Fix RLS Policy Violations for Surveys Table

  This migration resolves the "new row violates row-level security policy" errors
  by creating proper RLS policies that allow authenticated users to manage their own surveys.

  ## Changes Made:
  1. Drop all existing conflicting policies
  2. Create optimized policies for each CRUD operation
  3. Allow authenticated users to manage their own surveys
  4. Allow public access to active public surveys
  5. Use optimized auth function calls for better performance

  ## Security:
  - Users can only access/modify surveys where user_id matches their auth.uid()
  - Public surveys are readable by everyone when active and public
  - Anonymous users can only read public surveys
*/

-- Enable RLS on surveys table
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view surveys" ON surveys;
DROP POLICY IF EXISTS "Users can create surveys" ON surveys;
DROP POLICY IF EXISTS "Users can update surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete surveys" ON surveys;
DROP POLICY IF EXISTS "Anonymous can view public surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can access surveys" ON surveys;
DROP POLICY IF EXISTS "Public can view active surveys" ON surveys;
DROP POLICY IF EXISTS "Users can manage their own surveys" ON surveys;
DROP POLICY IF EXISTS "Public surveys are viewable by everyone" ON surveys;
DROP POLICY IF EXISTS "Optimized survey access" ON surveys;

-- Create comprehensive policies for authenticated users
-- Policy 1: SELECT - Users can view their own surveys + public surveys
CREATE POLICY "authenticated_select_surveys"
  ON surveys
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR 
    (is_active = true AND allow_public_access = true)
  );

-- Policy 2: INSERT - Users can create surveys for themselves
CREATE POLICY "authenticated_insert_surveys"
  ON surveys
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Policy 3: UPDATE - Users can update their own surveys
CREATE POLICY "authenticated_update_surveys"
  ON surveys
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Policy 4: DELETE - Users can delete their own surveys
CREATE POLICY "authenticated_delete_surveys"
  ON surveys
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Policy 5: Anonymous users can only view public surveys
CREATE POLICY "anon_select_public_surveys"
  ON surveys
  FOR SELECT
  TO anon
  USING (is_active = true AND allow_public_access = true);

-- Verify policies are created correctly
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'surveys'
ORDER BY policyname;