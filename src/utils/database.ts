import { supabase, DatabaseSurvey, DatabaseResponse } from '../lib/supabase';
import { Survey, Response } from '../types/survey';

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
  async saveSurvey(survey: Survey): Promise<Survey> {
    const surveyData = transformAppSurvey(survey);
    
    const { data, error } = await supabase
      .from('surveys')
      .upsert(surveyData)
      .select()
      .single();

    if (error) {
      console.error('Error saving survey:', error);
      throw new Error('Failed to save survey');
    }

    return transformDatabaseSurvey(data);
  },

  async getSurveys(): Promise<Survey[]> {
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching surveys:', error);
      throw new Error('Failed to fetch surveys');
    }

    return data.map(transformDatabaseSurvey);
  },

  async getSurveyByPublicId(publicId: string): Promise<Survey | null> {
    const { data, error } = await supabase
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

  async deleteSurvey(surveyId: string): Promise<void> {
    const { error } = await supabase
      .from('surveys')
      .delete()
      .eq('id', surveyId);

    if (error) {
      console.error('Error deleting survey:', error);
      throw new Error('Failed to delete survey');
    }
  },

  // Response operations
  async saveResponse(response: Response): Promise<Response> {
    const responseData = {
      id: response.id,
      survey_id: response.surveyId,
      answers: response.answers,
      submitted_at: response.submittedAt,
    };

    const { data, error } = await supabase
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

  async getResponsesForSurvey(surveyId: string): Promise<Response[]> {
    const { data, error } = await supabase
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

  async getAllResponses(): Promise<Response[]> {
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching all responses:', error);
      throw new Error('Failed to fetch responses');
    }

    return data.map(transformDatabaseResponse);
  },

  // Utility functions
  async checkSurveyLimits(surveyId: string): Promise<{ canSubmit: boolean; reason?: string }> {
    const { data: survey, error: surveyError } = await supabase
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
      const { count, error: countError } = await supabase
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
  }
};