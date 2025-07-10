import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging for deployment verification
console.log('Supabase Configuration Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'Not found',
  keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not found'
});
// Create a mock client if environment variables are missing (for development)
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found. Using localStorage for development.');
    return null;
  }
  
  console.log('✅ Supabase client created successfully');
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = createSupabaseClient();
export const isSupabaseConfigured = !!supabase;

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