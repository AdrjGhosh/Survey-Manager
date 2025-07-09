/*
  # Survey Management Database Schema

  1. New Tables
    - `surveys`
      - `id` (uuid, primary key)
      - `public_id` (text, unique, for public links)
      - `title` (text)
      - `description` (text)
      - `questions` (jsonb, stores question array)
      - `is_active` (boolean)
      - `allow_public_access` (boolean)
      - `response_limit` (integer, optional)
      - `expires_at` (timestamptz, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `responses`
      - `id` (uuid, primary key)
      - `survey_id` (uuid, foreign key)
      - `answers` (jsonb, stores answers array)
      - `submitted_at` (timestamptz)
      - `ip_address` (text, optional for analytics)

  2. Security
    - Enable RLS on both tables
    - Public read access for active surveys
    - Public insert access for responses
    - Full access for authenticated users (survey creators)

  3. Indexes
    - Index on public_id for fast public survey lookups
    - Index on survey_id for response queries
    - Index on submitted_at for analytics
*/

-- Create surveys table
CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'base64url'),
  title text NOT NULL,
  description text DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  allow_public_access boolean DEFAULT true,
  response_limit integer,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz DEFAULT now(),
  ip_address text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_surveys_public_id ON surveys(public_id);
CREATE INDEX IF NOT EXISTS idx_surveys_active ON surveys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_submitted_at ON responses(submitted_at);

-- Enable Row Level Security
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Policies for surveys table
CREATE POLICY "Public surveys are viewable by everyone"
  ON surveys
  FOR SELECT
  USING (is_active = true AND allow_public_access = true);

CREATE POLICY "Authenticated users can manage their surveys"
  ON surveys
  FOR ALL
  TO authenticated
  USING (true);

-- Policies for responses table
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

CREATE POLICY "Authenticated users can view all responses"
  ON responses
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();