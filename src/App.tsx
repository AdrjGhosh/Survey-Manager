import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { SurveyList } from './components/SurveyList';
import { SurveyBuilder } from './components/SurveyBuilder';
import { SurveyTaker } from './components/SurveyTaker';
import { SurveyAnalytics } from './components/SurveyAnalytics';
import { AdminDashboard } from './components/AdminDashboard';
import { PublicSurveyTaker } from './components/PublicSurveyTaker';
import { Survey } from './types/survey';
import { databaseUtils } from './utils/database';
import { isSupabaseConfigured } from './lib/supabase';
import { UserMenu } from './components/UserMenu';
import { LogIn } from 'lucide-react';

type View = 'list' | 'create' | 'edit' | 'take' | 'analytics' | 'admin' | 'public';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('list');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | undefined>();
  const [publicSurveyId, setPublicSurveyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSupabaseWarning, setShowSupabaseWarning] = useState(!isSupabaseConfigured);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Debug logging for deployment verification
  useEffect(() => {
    console.log('App Configuration Check:', {
      isSupabaseConfigured,
      hasUser: !!user,
      loading,
      environment: import.meta.env.MODE
    });
  }, [user, loading]);
  useEffect(() => {
    const loadSurveys = async () => {
      setIsLoading(true);
      try {
        const surveysData = await databaseUtils.getSurveys(user || undefined);
        setSurveys(surveysData);
      } catch (error) {
        console.error('Failed to load surveys:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only load surveys if user is available (or in development mode)
    if (user || !isSupabaseConfigured) {
      loadSurveys();
    }
    
    // Check if this is a public survey link
    const path = window.location.pathname;
    const publicMatch = path.match(/^\/s\/(.+)$/);
    if (publicMatch) {
      const surveyId = publicMatch[1];
      const loadPublicSurvey = async () => {
        try {
          const survey = await databaseUtils.getSurveyByPublicId(surveyId);
          if (survey && survey.isActive) {
            setSelectedSurvey(survey);
            setPublicSurveyId(surveyId);
            setCurrentView('public');
          }
        } catch (error) {
          console.error('Failed to load public survey:', error);
        }
      };
      loadPublicSurvey();
    }
  }, [user]);

  const refreshSurveys = async () => {
    setIsLoading(true);
    try {
      const surveysData = await databaseUtils.getSurveys(user || undefined);
      setSurveys(surveysData);
    } catch (error) {
      console.error('Failed to refresh surveys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSurvey = () => {
    setSelectedSurvey(undefined);
    setCurrentView('create');
  };

  const handleEditSurvey = (survey: Survey) => {
    setSelectedSurvey(survey);
    setCurrentView('edit');
  };

  const handleTakeSurvey = (survey: Survey) => {
    setSelectedSurvey(survey);
    setCurrentView('take');
  };

  const handleViewAnalytics = (survey: Survey) => {
    setSelectedSurvey(survey);
    setCurrentView('analytics');
  };

  const handleViewAdmin = () => {
    setCurrentView('admin');
  };

  const handleSaveSurvey = (survey: Survey) => {
    refreshSurveys();
    setCurrentView('list');
  };

  const handleBackToList = () => {
    setSelectedSurvey(undefined);
    setPublicSurveyId(null);
    setCurrentView('list');
    refreshSurveys();
    // Reset URL if coming from public link
    if (window.location.pathname.startsWith('/s/')) {
      window.history.pushState({}, '', '/');
    }
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication required screen for production
  if (!user && isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-16">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <LogIn className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Survey Manager</h2>
              <p className="text-gray-600 mb-8">
                Please sign in to access your surveys and create new ones. Your data is private and secure.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <LogIn size={16} />
                  Sign In
                </button>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showSupabaseWarning && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-bold">!</span>
              </div>
              <div>
                <p className="text-yellow-800 font-medium">Development Mode</p>
                <p className="text-yellow-700 text-sm">
                  Using localStorage for data storage. {user && `Signed in as: ${user.email}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSupabaseWarning(false)}
              className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Add user menu to all views */}
      {user && (
        <div className="absolute top-4 right-4 z-10">
          <UserMenu />
        </div>
      )}

      {currentView === 'list' && (
        <SurveyList
          surveys={surveys}
          onCreateSurvey={handleCreateSurvey}
          onEditSurvey={handleEditSurvey}
          onTakeSurvey={handleTakeSurvey}
          onViewAnalytics={handleViewAnalytics}
          onViewAdmin={handleViewAdmin}
          onRefresh={refreshSurveys}
          user={user}
        />
      )}

      {(currentView === 'create' || currentView === 'edit') && (
        <SurveyBuilder
          survey={selectedSurvey}
          onSave={handleSaveSurvey}
          onCancel={handleBackToList}
          user={user}
        />
      )}

      {currentView === 'take' && selectedSurvey && (
        <SurveyTaker
          survey={selectedSurvey}
          onBack={handleBackToList}
          user={user}
        />
      )}

      {currentView === 'analytics' && selectedSurvey && (
        <SurveyAnalytics
          survey={selectedSurvey}
          onBack={handleBackToList}
          user={user}
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard
          onBack={handleBackToList}
          user={user}
        />
      )}

      {currentView === 'public' && selectedSurvey && (
        <PublicSurveyTaker
          survey={selectedSurvey}
          publicId={publicSurveyId!}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;