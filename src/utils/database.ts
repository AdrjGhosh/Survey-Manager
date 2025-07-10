import { supabase, DatabaseSurvey, DatabaseResponse, isSupabaseConfigured } from '../lib/supabase';
import { Survey, Response } from '../types/survey';
import { storageUtils } from './storage';
import { User } from '../types/auth';

// Fallback to localStorage when Supabase is not configured
const useFallback = !isSupabaseConfigured;

// Transform database survey to app survey format
const transformDatabaseSurvey = (dbSurvey: DatabaseSurvey): Survey => ({
  id: dbSurvey.id,
  publicId: dbSurvey.public_id,
  title: dbSurvey.title,
  description: dbSurvey.description,
  questions: dbSurvey.questions,
  isActive: dbSurvey.is_active,
  allowPublicAccess: dbSurvey.allow_public_access,
  responseLimit: dbSurvey.response_limit,
  expiresAt: dbSurvey.expires_at,
  createdAt: dbSurvey.created_at,
});

// Transform app survey to database format
const transformAppSurvey = (survey: Survey): Partial<DatabaseSurvey> => ({
  id: survey.id,
  public_id: survey.publicId,
  title: survey.title,
  description: survey.description,
  questions: survey.questions,
  is_active: survey.isActive,
  allow_public_access: survey.allowPublicAccess,
  response_limit: survey.responseLimit,
  expires_at: survey.expiresAt,
});

// Transform database response to app response format
const transformDatabaseResponse = (dbResponse: DatabaseResponse): Response => ({
  id: dbResponse.id,
  surveyId: dbResponse.survey_id,
  answers: dbResponse.answers,
  submittedAt: dbResponse.submitted_at,
});

export const databaseUtils = {
  // Survey operations
  async saveSurvey(survey: Survey, user?: User): Promise<Survey> {
    if (useFallback) {
      storageUtils.saveSurvey(survey);
      return survey;
    }

    // Enhanced error logging for debugging
    console.log('Attempting to save survey:', {
      surveyId: survey.id,
      hasUser: !!user,
      userId: user?.id,
      isSupabaseConfigured
    });

    const surveyData = {
      ...transformAppSurvey(survey),
    };

    // Remove undefined values that might cause issues
    Object.keys(surveyData).forEach(key => {
      if (surveyData[key as keyof typeof surveyData] === undefined) {
        delete surveyData[key as keyof typeof surveyData];
      }
    });

    console.log('Survey data being sent:', surveyData);
    
    const { data, error } = await supabase!
      .from('surveys')
      .upsert(surveyData)
      .select()
      .single();

    if (error) {
      console.error('Detailed error saving survey:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error('Failed to save survey');
    }

    console.log('Survey saved successfully:', data);
    return transformDatabaseSurvey(data);
  },

  async getSurveys(user?: User): Promise<Survey[]> {
    if (useFallback) {
      return storageUtils.getSurveys();
    }

    let query = supabase!.from('surveys').select('*');
    
    // If user is provided, filter by user_id
    if (user) {
      query = query.eq('user_id', user.id);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching surveys:', error);
      throw new Error('Failed to fetch surveys');
    }

    return data.map(transformDatabaseSurvey);
  },

  async getSurveyByPublicId(publicId: string): Promise<Survey | null> {
    if (useFallback) {
      return storageUtils.getSurveyByPublicId(publicId);
    }

    const { data, error } = await supabase!
      .from('surveys')
      .select('*')
      .eq('public_id', publicId)
      .eq('is_active', true)
      .eq('allow_public_access', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No survey found
      }
      console.error('Error fetching survey by public ID:', error);
      throw new Error('Failed to fetch survey');
    }

    return transformDatabaseSurvey(data);
  },

  async deleteSurvey(surveyId: string, user?: User): Promise<void> {
    if (useFallback) {
      storageUtils.deleteSurvey(surveyId);
      return;
    }

    let query = supabase!.from('surveys').delete().eq('id', surveyId);
    
    // Add user filter for security (RLS will also enforce this)
    if (user) {
      query = query.eq('user_id', user.id);
    }
    
    const { error } = await query;

    if (error) {
      console.error('Error deleting survey:', error);
      throw new Error('Failed to delete survey');
    }
  },

  // Response operations
  async saveResponse(response: Response): Promise<Response> {
    if (useFallback) {
      storageUtils.saveResponse(response);
      return response;
    }

    const responseData = {
      id: response.id,
      survey_id: response.surveyId,
      answers: response.answers,
      submitted_at: response.submittedAt,
    };

    const { data, error } = await supabase!
      .from('responses')
      .insert(responseData)
      .select()
      .single();

    if (error) {
      console.error('Error saving response:', error);
      throw new Error('Failed to save response');
    }

    return transformDatabaseResponse(data);
  },

  async getResponsesForSurvey(surveyId: string, user?: User): Promise<Response[]> {
    if (useFallback) {
      return storageUtils.getResponsesForSurvey(surveyId);
    }

    // First verify the user owns this survey (if user is provided)
    if (user) {
      const { data: survey, error: surveyError } = await supabase!
        .from('surveys')
        .select('user_id')
        .eq('id', surveyId)
        .eq('user_id', user.id)
        .single();
        
      if (surveyError || !survey) {
        throw new Error('Survey not found or access denied');
      }
    }
    
    const { data, error } = await supabase!
      .from('responses')
      .select('*')
      .eq('survey_id', surveyId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching responses:', error);
      throw new Error('Failed to fetch responses');
    }

    return data.map(transformDatabaseResponse);
  },

  async getAllResponses(user?: User): Promise<Response[]> {
    if (useFallback) {
      return storageUtils.getResponses();
    }

    let query = supabase!.from('responses').select('*');
    
    // If user is provided, only get responses to their surveys
    if (user) {
      query = query.in('survey_id', 
        supabase!.from('surveys')
          .select('id')
          .eq('user_id', user.id)
      );
    }
    
    const { data, error } = await query
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching all responses:', error);
      throw new Error('Failed to fetch responses');
    }

    return data.map(transformDatabaseResponse);
  },

  // Utility functions
  async checkSurveyLimits(surveyId: string, user?: User): Promise<{ canSubmit: boolean; reason?: string }> {
    if (useFallback) {
      // Simple fallback logic for localStorage
      const surveys = storageUtils.getSurveys();
      const survey = surveys.find(s => s.id === surveyId);
      
      if (!survey) {
        return { canSubmit: false, reason: 'Survey not found' };
      }

      if (survey.expiresAt && new Date() > new Date(survey.expiresAt)) {
        return { canSubmit: false, reason: 'Survey has expired' };
      }

      if (survey.responseLimit) {
        const responses = storageUtils.getResponsesForSurvey(surveyId);
        if (responses.length >= survey.responseLimit) {
          return { canSubmit: false, reason: 'Response limit reached' };
        }
      }

      return { canSubmit: true };
    }

    const { data: survey, error: surveyError } = await supabase!
      .from('surveys')
      .select('response_limit, expires_at')
      .eq('id', surveyId)
      .single();

    if (surveyError) {
      return { canSubmit: false, reason: 'Survey not found' };
    }

    // Check expiration
    if (survey.expires_at && new Date() > new Date(survey.expires_at)) {
      return { canSubmit: false, reason: 'Survey has expired' };
    }

    // Check response limit
    if (survey.response_limit) {
      const { count, error: countError } = await supabase!
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', surveyId);

      if (countError) {
        return { canSubmit: false, reason: 'Error checking response limit' };
      }

      if (count && count >= survey.response_limit) {
        return { canSubmit: false, reason: 'Response limit reached' };
      }
    }

    return { canSubmit: true };
  },

  // User-specific utility functions
  async getUserSurveyCount(user: User): Promise<number> {
    if (useFallback) {
      return storageUtils.getSurveys().length;
    }

    const { count, error } = await supabase!
      .from('surveys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error getting survey count:', error);
      return 0;
    }

    return count || 0;
  },

  async getUserResponseCount(user: User): Promise<number> {
    if (useFallback) {
      return storageUtils.getResponses().length;
    }

    const { count, error } = await supabase!
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error getting response count:', error);
      return 0;
    }

    return count || 0;
  }
};