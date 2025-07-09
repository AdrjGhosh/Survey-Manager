import React from 'react';
import { Plus, Edit, Trash2, Eye, BarChart3, Calendar, Users, ToggleLeft, ToggleRight, Settings, Share2, Copy, ExternalLink } from 'lucide-react';
import { Survey } from '../types/survey';
import { databaseUtils } from '../utils/database';
import { User } from '../types/auth';

interface SurveyListProps {
  surveys: Survey[];
  onCreateSurvey: () => void;
  onEditSurvey: (survey: Survey) => void;
  onTakeSurvey: (survey: Survey) => void;
  onViewAnalytics: (survey: Survey) => void;
  onViewAdmin: () => void;
  onRefresh: () => void;
  user: User | null;
}

export const SurveyList: React.FC<SurveyListProps> = ({
  surveys,
  onCreateSurvey,
  onEditSurvey,
  onTakeSurvey,
  onViewAnalytics,
  onViewAdmin,
  onRefresh,
  user,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleDeleteSurvey = async (surveyId: string) => {
    if (window.confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        await databaseUtils.deleteSurvey(surveyId, user || undefined);
        onRefresh();
      } catch (error) {
        alert('Failed to delete survey. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleSurveyStatus = async (survey: Survey) => {
    setIsLoading(true);
    try {
    const updatedSurvey = { ...survey, isActive: !survey.isActive };
      await databaseUtils.saveSurvey(updatedSurvey, user || undefined);
      onRefresh();
    } catch (error) {
      alert('Failed to update survey status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPublicLink = (survey: Survey) => {
    if (survey.publicId && survey.allowPublicAccess) {
      const publicUrl = `${window.location.origin}/s/${survey.publicId}`;
      navigator.clipboard.writeText(publicUrl);
      alert('Public link copied to clipboard!');
    }
  };

  const openPublicLink = (survey: Survey) => {
    if (survey.publicId && survey.allowPublicAccess) {
      const publicUrl = `${window.location.origin}/s/${survey.publicId}`;
      window.open(publicUrl, '_blank');
    }
  };

  const getResponseCount = async (surveyId: string) => {
    try {
      const responses = await databaseUtils.getResponsesForSurvey(surveyId, user || undefined);
      return responses.length;
    } catch (error) {
      return 0;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 safe-area-inset">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Survey Manager</h1>
          <p className="text-gray-600 mt-1">Create, manage, and analyze your surveys</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onViewAdmin}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium touch-manipulation"
          >
            <Settings size={16} />
            Admin Dashboard
          </button>
          <button
            onClick={onCreateSurvey}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium touch-manipulation"
          >
            <Plus size={18} />
            Create Survey
          </button>
        </div>
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 max-w-md mx-auto">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No surveys yet</h3>
            <p className="text-gray-600 mb-6">Create your first survey to get started</p>
            <button
              onClick={onCreateSurvey}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mx-auto"
            >
              <Plus size={16} />
              Create Survey
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {survey.title}
                    </h3>
                    {survey.description && (
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {survey.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleSurveyStatus(survey)}
                    className={`p-1 rounded transition-colors ${
                      survey.isActive 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {survey.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} />
                    Created {formatDate(survey.createdAt)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users size={14} />
                    <ResponseCount surveyId={survey.id} user={user} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      survey.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {survey.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {survey.allowPublicAccess && (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Public
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => onTakeSurvey(survey)}
                    className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                  
                  {survey.allowPublicAccess && survey.publicId && (
                    <>
                      <button
                        onClick={() => copyPublicLink(survey)}
                        className="flex items-center gap-1 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 touch-manipulation"
                        title="Copy public link"
                      >
                        <Copy size={14} />
                        Copy Link
                      </button>
                      <button
                        onClick={() => openPublicLink(survey)}
                        className="flex items-center gap-1 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 touch-manipulation"
                        title="Open public link"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => onEditSurvey(survey)}
                    className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 touch-manipulation"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => onViewAnalytics(survey)}
                    className="flex items-center gap-1 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 touch-manipulation"
                  >
                    <BarChart3 size={14} />
                    Analytics
                  </button>
                  <button
                    onClick={() => handleDeleteSurvey(survey.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 touch-manipulation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Component to handle async response count  
const ResponseCount: React.FC<{ surveyId: string; user: User | null }> = ({ surveyId, user }) => {
  const [count, setCount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCount = async () => {
      try {
        const responses = await databaseUtils.getResponsesForSurvey(surveyId, user || undefined);
        setCount(responses.length);
      } catch (error) {
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, [surveyId, user]);

  if (loading) {
    return <span>...</span>;
  }

  return <span>{count} responses</span>;
};