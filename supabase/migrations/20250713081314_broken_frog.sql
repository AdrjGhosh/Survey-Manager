/*
  # Fix Multiple Permissive Policies Issue

  1. Problem
    - Multiple permissive policies for authenticated users on surveys table
    - "Authenticated users can access surveys" and "Public can view active surveys" both apply to authenticated role
    
  2. Solution
    - Drop the conflicting "Public can view active surveys" policy
    - Keep only "Authenticated users can access surveys" for authenticated role
    - Create separate "anon" role policy for true public access
*/

-- Drop the conflicting public policy that applies to authenticated users
DROP POLICY IF EXISTS "Public can view active surveys" ON surveys;

-- Keep the authenticated policy as is
-- (This already handles both user's own surveys AND public surveys)

-- Create a separate policy specifically for anonymous users if needed
CREATE POLICY "Anonymous can view public surveys"
  ON surveys
  FOR SELECT
  TO anon
  USING (
    is_active = true 
    AND allow_public_access = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Verify RLS is enabled
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;