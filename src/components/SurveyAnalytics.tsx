import React from 'react';
import { ArrowLeft, Download, Users, BarChart3, Calendar } from 'lucide-react';
import { Survey, Response } from '../types/survey';
import { databaseUtils } from '../utils/database';

interface SurveyAnalyticsProps {
  survey: Survey;
  onBack: () => void;
}

export const SurveyAnalytics: React.FC<SurveyAnalyticsProps> = ({ survey, onBack }) => {
  const [responses, setResponses] = React.useState<Response[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadResponses = async () => {
      setIsLoading(true);
      try {
        const responseData = await databaseUtils.getResponsesForSurvey(survey.id);
        setResponses(responseData);
      } catch (error) {
        console.error('Failed to load responses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResponses();
  }, [survey.id]);

  const getQuestionAnalytics = (questionId: string) => {
    const question = survey.questions.find(q => q.id === questionId);
    if (!question) return null;

    const answers = responses.map(r => r.answers.find(a => a.questionId === questionId)?.value).filter(Boolean);
    
    if (question.type === 'multiple-choice') {
      const distribution: { [key: string]: number } = {};
      answers.forEach(answer => {
        distribution[answer as string] = (distribution[answer as string] || 0) + 1;
      });
      return { type: 'choice', distribution };
    }
    
    if (question.type === 'rating') {
      const ratings = answers.map(a => Number(a)).filter(n => !isNaN(n));
      const average = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      const distribution: { [key: string]: number } = {};
      ratings.forEach(rating => {
        distribution[rating.toString()] = (distribution[rating.toString()] || 0) + 1;
      });
      return { type: 'rating', average, distribution };
    }
    
    return { type: 'text', answers };
  };

  const exportData = () => {
    const data = {
      survey,
      responses,
      analytics: survey.questions.map(q => ({
        question: q,
        analytics: getQuestionAnalytics(q.id)
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${survey.title}-analytics.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{survey.title}</h1>
            <p className="text-gray-600">Survey Analytics</p>
          </div>
        </div>
        <button
          onClick={exportData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Download size={16} />
          Export Data
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Total Responses</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">{responses.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Questions</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">{survey.questions.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Created</h3>
          </div>
          <p className="text-lg font-medium text-purple-600">
            {new Date(survey.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {responses.length === 0 ? (
        isLoading ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-gray-400 mb-4">
                <BarChart3 className="w-16 h-16 mx-auto animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading analytics...</h3>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
            <p className="text-gray-600">Share your survey to start collecting responses</p>
          </div>
        </div>
        )
      ) : (
        <div className="space-y-8">
          {survey.questions.map((question) => {
            const analytics = getQuestionAnalytics(question.id);
            
            return (
              <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{question.title}</h3>
                
                {analytics?.type === 'choice' && (
                  <div className="space-y-3">
                    {Object.entries(analytics.distribution).map(([choice, count]) => (
                      <div key={choice} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-gray-600">{choice}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                          <div
                            className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${(count / responses.length) * 100}%` }}
                          />
                        </div>
                        <div className="text-sm text-gray-600 min-w-[60px]">
                          {count} ({Math.round((count / responses.length) * 100)}%)
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {analytics?.type === 'rating' && (
                  <div>
                    <div className="mb-4">
                      <span className="text-2xl font-bold text-blue-600">
                        {analytics.average.toFixed(1)}
                      </span>
                      <span className="text-gray-600 ml-2">
                        / {question.maxRating || 5} average rating
                      </span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(analytics.distribution).map(([rating, count]) => (
                        <div key={rating} className="flex items-center gap-4">
                          <div className="w-12 text-sm text-gray-600">{rating} ★</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${(count / responses.length) * 100}%` }}
                            />
                          </div>
                          <div className="text-sm text-gray-600 min-w-[40px]">{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analytics?.type === 'text' && (
                  <div className="space-y-3">
                    {analytics.answers.slice(0, 5).map((answer, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-700">{answer}</p>
                      </div>
                    ))}
                    {analytics.answers.length > 5 && (
                      <p className="text-sm text-gray-500">
                        and {analytics.answers.length - 5} more responses...
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};