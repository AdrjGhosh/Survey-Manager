import React, { useState, useEffect } from 'react';
import { SurveyList } from './components/SurveyList';
import { SurveyBuilder } from './components/SurveyBuilder';
import { SurveyTaker } from './components/SurveyTaker';
import { SurveyAnalytics } from './components/SurveyAnalytics';
import { AdminDashboard } from './components/AdminDashboard';
import { PublicSurveyTaker } from './components/PublicSurveyTaker';
import { Survey } from './types/survey';
import { storageUtils } from './utils/storage';

type View = 'list' | 'create' | 'edit' | 'take' | 'analytics' | 'admin' | 'public';

function App() {
  const [currentView, setCurrentView] = useState<View>('list');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | undefined>();
  const [publicSurveyId, setPublicSurveyId] = useState<string | null>(null);

  useEffect(() => {
    setSurveys(storageUtils.getSurveys());
    
    // Check if this is a public survey link
    const path = window.location.pathname;
    const publicMatch = path.match(/^\/s\/(.+)$/);
    if (publicMatch) {
      const surveyId = publicMatch[1];
      const survey = storageUtils.getSurveyByPublicId(surveyId);
      if (survey && survey.isActive) {
        setSelectedSurvey(survey);
        setPublicSurveyId(surveyId);
        setCurrentView('public');
      }
    }
  }, []);

  const refreshSurveys = () => {
    setSurveys(storageUtils.getSurveys());
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

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'list' && (
        <SurveyList
          surveys={surveys}
          onCreateSurvey={handleCreateSurvey}
          onEditSurvey={handleEditSurvey}
          onTakeSurvey={handleTakeSurvey}
          onViewAnalytics={handleViewAnalytics}
          onViewAdmin={handleViewAdmin}
          onRefresh={refreshSurveys}
        />
      )}

      {(currentView === 'create' || currentView === 'edit') && (
        <SurveyBuilder
          survey={selectedSurvey}
          onSave={handleSaveSurvey}
          onCancel={handleBackToList}
        />
      )}

      {currentView === 'take' && selectedSurvey && (
        <SurveyTaker
          survey={selectedSurvey}
          onBack={handleBackToList}
        />
      )}

      {currentView === 'analytics' && selectedSurvey && (
        <SurveyAnalytics
          survey={selectedSurvey}
          onBack={handleBackToList}
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard
          onBack={handleBackToList}
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
}

export default App;