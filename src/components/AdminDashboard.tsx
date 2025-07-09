import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Filter, Calendar, TrendingUp, Users, BarChart3, PieChart, FileText, FileSpreadsheet, FileImage } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Survey, Response } from '../types/survey';
import { databaseUtils } from '../utils/database';
import { exportUtils } from '../utils/export';
import { User } from '../types/auth';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement);

interface AdminDashboardProps {
  onBack: () => void;
  user: User | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, user }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSurveys = async () => {
      setIsLoading(true);
      try {
        const allSurveys = await databaseUtils.getSurveys(user || undefined);
        setSurveys(allSurveys);
        if (allSurveys.length > 0) {
          setSelectedSurvey(allSurveys[0]);
        }
      } catch (error) {
        console.error('Failed to load surveys:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSurveys();
  }, []);

  useEffect(() => {
    const loadResponses = async () => {
      if (selectedSurvey) {
        try {
          let surveyResponses = await databaseUtils.getResponsesForSurvey(selectedSurvey.id, user || undefined);
      
          // Apply date filter
          if (dateRange.start && dateRange.end) {
            surveyResponses = surveyResponses.filter(response => {
              const responseDate = new Date(response.submittedAt);
              return responseDate >= new Date(dateRange.start) && responseDate <= new Date(dateRange.end);
            });
          }
      
          setResponses(surveyResponses);
        } catch (error) {
          console.error('Failed to load responses:', error);
        }
      }
    };

    loadResponses();
  }, [selectedSurvey, dateRange, user]);

  const getResponsesOverTime = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const responseCounts = last30Days.map(date => {
      return responses.filter(response => 
        response.submittedAt.split('T')[0] === date
      ).length;
    });

    return {
      labels: last30Days.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Responses',
        data: responseCounts,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    };
  };

  const getQuestionAnalytics = (questionId: string) => {
    const question = selectedSurvey?.questions.find(q => q.id === questionId);
    if (!question) return null;

    const answers = responses.map(r => r.answers.find(a => a.questionId === questionId)?.value).filter(Boolean);
    
    if (question.type === 'multiple-choice') {
      const distribution: { [key: string]: number } = {};
      answers.forEach(answer => {
        distribution[answer as string] = (distribution[answer as string] || 0) + 1;
      });
      
      return {
        labels: Object.keys(distribution),
        datasets: [{
          data: Object.values(distribution),
          backgroundColor: [
            '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'
          ],
          borderWidth: 0,
        }]
      };
    }
    
    if (question.type === 'rating') {
      const ratings = answers.map(a => Number(a)).filter(n => !isNaN(n));
      const distribution: { [key: string]: number } = {};
      for (let i = 1; i <= (question.maxRating || 5); i++) {
        distribution[i.toString()] = 0;
      }
      ratings.forEach(rating => {
        distribution[rating.toString()] = (distribution[rating.toString()] || 0) + 1;
      });
      
      return {
        labels: Object.keys(distribution).map(k => `${k} ★`),
        datasets: [{
          label: 'Responses',
          data: Object.values(distribution),
          backgroundColor: '#F59E0B',
          borderColor: '#D97706',
          borderWidth: 1,
        }]
      };
    }
    
    return null;
  };

  const getTotalStats = () => {
    const totalResponses = responses.length;
    const totalSurveys = surveys.length;
    const activeSurveys = surveys.filter(s => s.isActive).length;
    const avgResponsesPerSurvey = totalSurveys > 0 ? Math.round(totalResponses / totalSurveys) : 0;

    return { totalResponses, totalSurveys, activeSurveys, avgResponsesPerSurvey };
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (!selectedSurvey) return;
    
    setIsExporting(true);
    try {
      switch (format) {
        case 'csv':
          exportUtils.exportToCSV(selectedSurvey, responses);
          break;
        case 'excel':
          exportUtils.exportToExcel(selectedSurvey, responses);
          break;
        case 'pdf':
          await exportUtils.exportToPDF(selectedSurvey, responses);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const stats = getTotalStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Analytics and insights for your surveys</p>
            </div>
          </div>
          
          {selectedSurvey && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                <FileText size={16} />
                CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                <FileImage size={16} />
                PDF
              </button>
            </div>
          )}
        </div>

        {/* Overview Stats */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Total Surveys</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.totalSurveys}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.activeSurveys} active</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Total Responses</h3>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.totalResponses}</p>
            <p className="text-sm text-gray-500 mt-1">Across all surveys</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Avg per Survey</h3>
            </div>
            <p className="text-3xl font-bold text-purple-600">{stats.avgResponsesPerSurvey}</p>
            <p className="text-sm text-gray-500 mt-1">responses</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">This Month</h3>
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {responses.filter(r => {
                const responseDate = new Date(r.submittedAt);
                const now = new Date();
                return responseDate.getMonth() === now.getMonth() && responseDate.getFullYear() === now.getFullYear();
              }).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">responses</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Survey:</label>
              <select
                value={selectedSurvey?.id || ''}
                onChange={(e) => {
                  const survey = surveys.find(s => s.id === e.target.value);
                  setSelectedSurvey(survey || null);
                }}
                className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {surveys.map(survey => (
                  <option key={survey.id} value={survey.id}>{survey.title}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">From:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">To:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            {(dateRange.start || dateRange.end) && (
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {selectedSurvey && responses.length > 0 ? (
          <div className="space-y-8">
            {/* Responses Over Time */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Responses Over Time (Last 30 Days)</h3>
              <div className="h-64">
                <Line 
                  data={getResponsesOverTime()} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                      }
                    }
                  }} 
                />
              </div>
            </div>

            {/* Question Analytics */}
            <div className="grid gap-6 lg:grid-cols-2">
              {selectedSurvey.questions.map((question) => {
                const chartData = getQuestionAnalytics(question.id);
                if (!chartData) return null;

                return (
                  <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{question.title}</h3>
                    <div className="h-64">
                      {question.type === 'multiple-choice' ? (
                        <Pie 
                          data={chartData} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { position: 'bottom' }
                            }
                          }} 
                        />
                      ) : (
                        <Bar 
                          data={chartData} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: { stepSize: 1 }
                              }
                            }
                          }} 
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : selectedSurvey ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-gray-400 mb-4">
                <BarChart3 className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
              <p className="text-gray-600">Share your survey to start collecting responses</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-gray-400 mb-4">
                <BarChart3 className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No surveys found</h3>
              <p className="text-gray-600">Create your first survey to see analytics</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};