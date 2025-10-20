export interface Question {
  id: string;
  type: 'text' | 'multiple-choice' | 'multiple-select' | 'rating' | 'email' | 'number' | 'textarea';
  title: string;
  required: boolean;
  options?: string[];
  maxRating?: number;
}

export interface Survey {
  id: string;
  publicId?: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  isActive: boolean;
  allowPublicAccess?: boolean;
  responseLimit?: number;
  expiresAt?: string;
}

export interface Answer {
  questionId: string;
  value: string | number | string[];
}

export interface Response {
  id: string;
  surveyId: string;
  answers: Answer[];
  submittedAt: string;
}

export interface SurveyStats {
  totalResponses: number;
  averageRating: { [questionId: string]: number };
  choiceDistribution: { [questionId: string]: { [choice: string]: number } };
}