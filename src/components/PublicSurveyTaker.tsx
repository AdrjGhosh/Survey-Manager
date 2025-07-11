import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Survey, Question, Response } from '../types/survey';
import { databaseUtils } from '../utils/database';

// Generate a proper UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface PublicSurveyTakerProps {
  survey: Survey;
  publicId: string;
}

export const PublicSurveyTaker: React.FC<PublicSurveyTakerProps> = ({ survey, publicId }) => {
  const [answers, setAnswers] = useState<{ [questionId: string]: string | number }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ [questionId: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseCount, setResponseCount] = useState(0);

  // Load response count on component mount
  React.useEffect(() => {
    const loadResponseCount = async () => {
      try {
        const responses = await databaseUtils.getResponsesForSurvey(survey.id);
        setResponseCount(responses.length);
      } catch (error) {
        console.error('Failed to load response count:', error);
      }
    };
    loadResponseCount();
  }, [survey.id]);

  // Check if survey is expired
  const isExpired = survey.expiresAt && new Date() > new Date(survey.expiresAt);
  
  // Check if response limit is reached
  const isLimitReached = survey.responseLimit && responseCount >= survey.responseLimit;

  const handleAnswerChange = (questionId: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors(prev => ({ ...prev, [questionId]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [questionId: string]: string } = {};
    
    survey.questions.forEach(question => {
      if (question.required && !answers[question.id]) {
        newErrors[question.id] = 'This field is required';
      }
      
      if (question.type === 'email' && answers[question.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(answers[question.id] as string)) {
          newErrors[question.id] = 'Please enter a valid email address';
        }
      }
      
      if (question.type === 'number' && answers[question.id]) {
        const num = Number(answers[question.id]);
        if (isNaN(num)) {
          newErrors[question.id] = 'Please enter a valid number';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response: Response = {
        id: generateUUID(),
        surveyId: survey.id,
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value
        })),
        submittedAt: new Date().toISOString(),
      };

      console.log('Submitting public response:', {
        surveyId: response.surveyId,
        publicId: publicId,
        answersCount: response.answers.length
      });

      await databaseUtils.saveResponse(response);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to submit response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to submit response: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const answer = answers[question.id];
    const error = errors[question.id];

    return (
      <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 leading-relaxed">
            {question.title}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
        </div>

        {question.type === 'text' && (
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className={`w-full p-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
              error ? 'border-red-500' : 'border-gray-300'
            } hover:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed`}
            placeholder="Your answer"
            autoComplete="off"
            spellCheck="true"
          />
        )}

        {question.type === 'textarea' && (
          <textarea
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            rows={3}
            className={`w-full p-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-y min-h-[80px] ${
              error ? 'border-red-500' : 'border-gray-300'
            } hover:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed`}
            placeholder="Your answer"
            autoComplete="off"
            spellCheck="true"
          />
        )}

        {question.type === 'email' && (
          <input
            type="email"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className={`w-full p-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
              error ? 'border-red-500' : 'border-gray-300'
            } hover:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed`}
            placeholder="your.email@example.com"
            autoComplete="email"
            inputMode="email"
          />
        )}

        {question.type === 'number' && (
          <input
            type="number"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className={`w-full p-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
              error ? 'border-red-500' : 'border-gray-300'
            } hover:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed`}
            placeholder="Enter a number"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        )}

        {question.type === 'multiple-choice' && (
          <div className="space-y-2 sm:space-y-3">
            {question.options?.map((option, index) => (
              <label key={index} className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answer === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-4 h-4 mt-0.5 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-2"
                />
                <span className="text-gray-700 group-hover:text-gray-900 transition-colors text-sm sm:text-base leading-relaxed flex-1">{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'rating' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {Array.from({ length: question.maxRating || 5 }).map((_, index) => (
              <button
                key={index}
                onClick={() => handleAnswerChange(question.id, index + 1)}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center font-medium transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm sm:text-base ${
                  (answer as number) >= index + 1
                    ? 'bg-yellow-400 border-yellow-400 text-white shadow-md'
                    : 'border-gray-300 text-gray-400 hover:border-yellow-400 hover:text-yellow-500'
                }`}
                type="button"
                aria-label={`Rate ${index + 1} out of ${question.maxRating || 5}`}
              >
                {index + 1}
              </button>
            ))}
            </div>
            <span className="text-sm text-gray-600 sm:ml-3">
              {answer ? `${answer}/${question.maxRating || 5}` : 'Not rated'}
            </span>
          </div>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
      </div>
    );
  };

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-4">
            <Clock className="w-12 h-12 text-orange-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Survey Expired</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            This survey is no longer accepting responses. The deadline was{' '}
            {new Date(survey.expiresAt!).toLocaleDateString()}.
          </p>
        </div>
      </div>
    );
  }

  if (isLimitReached) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Response Limit Reached</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            This survey has reached its maximum number of responses ({survey.responseLimit}).
            Thank you for your interest!
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Thank you for your response!
          </h2>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">
            Your answers have been submitted successfully and will be reviewed by the survey creator.
          </p>
          <div className="text-sm text-gray-500">
            Response submitted at {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 px-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">{survey.title}</h1>
          {survey.description && (
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed">{survey.description}</p>
          )}
          
          {/* Survey info */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 text-xs sm:text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <span>{survey.questions.length} questions</span>
            </div>
            {survey.responseLimit && (
              <div className="flex items-center gap-1">
                <span>{responseCount}/{survey.responseLimit} responses</span>
              </div>
            )}
            {survey.expiresAt && (
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>Expires {new Date(survey.expiresAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 sm:space-y-6">
          {survey.questions.map(renderQuestion)}
          
          <div className="flex justify-center pt-6 sm:pt-8">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 sm:px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Survey
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200 pb-4">
          <p className="text-sm text-gray-500">
            Powered by Survey Manager
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Works on all devices and browsers
          </p>
        </div>
      </div>
    </div>
  );
};