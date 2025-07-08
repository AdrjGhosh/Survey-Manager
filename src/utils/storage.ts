import { Survey, Response } from '../types/survey';

const SURVEYS_KEY = 'surveys';
const RESPONSES_KEY = 'responses';

export const storageUtils = {
  // Survey operations
  saveSurvey: (survey: Survey) => {
    const surveys = getSurveys();
    const existingIndex = surveys.findIndex(s => s.id === survey.id);
    
    if (existingIndex >= 0) {
      surveys[existingIndex] = survey;
    } else {
      surveys.push(survey);
    }
    
    localStorage.setItem(SURVEYS_KEY, JSON.stringify(surveys));
  },

  getSurveys: (): Survey[] => {
    const data = localStorage.getItem(SURVEYS_KEY);
    return data ? JSON.parse(data) : [];
  },

  getSurveyByPublicId: (publicId: string): Survey | null => {
    const surveys = getSurveys();
    return surveys.find(s => s.publicId === publicId) || null;
  },

  deleteSurvey: (surveyId: string) => {
    const surveys = getSurveys().filter(s => s.id !== surveyId);
    localStorage.setItem(SURVEYS_KEY, JSON.stringify(surveys));
    
    // Also delete related responses
    const responses = getResponses().filter(r => r.surveyId !== surveyId);
    localStorage.setItem(RESPONSES_KEY, JSON.stringify(responses));
  },

  // Response operations
  saveResponse: (response: Response) => {
    const responses = getResponses();
    responses.push(response);
    localStorage.setItem(RESPONSES_KEY, JSON.stringify(responses));
  },

  getResponses: (): Response[] => {
    const data = localStorage.getItem(RESPONSES_KEY);
    return data ? JSON.parse(data) : [];
  },

  getResponsesForSurvey: (surveyId: string): Response[] => {
    return getResponses().filter(r => r.surveyId === surveyId);
  },

  exportData: () => {
    const surveys = getSurveys();
    const responses = getResponses();
    
    const data = {
      surveys,
      responses,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'survey-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }
};

// Helper functions
const getSurveys = () => storageUtils.getSurveys();
const getResponses = () => storageUtils.getResponses();