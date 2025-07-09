import React, { useState } from 'react';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { Survey, Question, Response, Answer } from '../types/survey';
import { databaseUtils } from '../utils/database';
import { User } from '../types/auth';

interface SurveyTakerProps {
  survey: Survey;
  onBack: () => void;
  user: User | null;
}

export const SurveyTaker: React.FC<SurveyTakerProps> = ({ survey, onBack, user }) => {
  const [answers, setAnswers] = useState<{ [questionId: string]: string | number }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ [questionId: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      id: Date.now().toString(),
      surveyId: survey.id,
      answers: Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value
      })),
      submittedAt: new Date().toISOString(),
    };

      await databaseUtils.saveResponse(response);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to submit response:', error);
      alert('Failed to submit response. Please try again.');
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
            } hover:border-gray-400`}
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
            } hover:border-gray-400`}
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
            } hover:border-gray-400`}
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
            } hover:border-gray-400`}
            placeholder="Enter a number"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        )}

        {question.type === 'multiple-choice' && (
          <div className="space-y-2 sm:space-y-3">
            {question.options?.map((option, index) => (
              <label key={index} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answer === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-4 h-4 mt-0.5 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-2"
                />
                <span className="text-gray-700 text-sm sm:text-base leading-relaxed flex-1">{option}</span>
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
                    ? 'bg-yellow-400 border-yellow-400 text-white'
                    : 'border-gray-300 text-gray-400 hover:border-yellow-400'
                }`}
                type="button"
                aria-label={`Rate ${index + 1} out of ${question.maxRating || 5}`}
              >
                {index + 1}
              </button>
            ))}
            </div>
            <span className="text-sm text-gray-600 sm:ml-2">
              {answer ? `${answer}/${question.maxRating || 5}` : 'Not rated'}
            </span>
          </div>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 text-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Thank you for your response!
          </h2>
          <p className="text-gray-600 mb-8 text-sm sm:text-base">
            Your answers have been submitted successfully.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium text-sm sm:text-base"
          >
            Back to Surveys
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 safe-area-inset">
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{survey.title}</h1>
          {survey.description && (
            <p className="text-gray-600 mt-1 text-sm sm:text-base">{survey.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {survey.questions.map(renderQuestion)}
        
        <div className="flex justify-center sm:justify-end pt-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium text-sm sm:text-base w-full sm:w-auto justify-center touch-manipulation"
          >
            <Send size={16} />
            {isSubmitting ? 'Submitting...' : 'Submit Survey'}
          </button>
        </div>
      </div>
    </div>
  );
};