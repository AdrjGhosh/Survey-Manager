import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DatabaseSurvey {
  id: string;
  public_id: string;
  title: string;
  description: string;
  questions: any[];
  is_active: boolean;
  allow_public_access: boolean;
  response_limit?: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseResponse {
  id: string;
  survey_id: string;
  answers: any[];
  submitted_at: string;
  ip_address?: string;
}