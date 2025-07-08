import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Save, ArrowLeft, Eye, ToggleLeft, ToggleRight, Share2, Copy, Calendar, Users } from 'lucide-react';
import { Question, Survey } from '../types/survey';
import { storageUtils } from '../utils/storage';

interface SurveyBuilderProps {
  survey?: Survey;
  onSave: (survey: Survey) => void;
  onCancel: () => void;
}

const questionTypes = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'rating', label: 'Rating' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
];

export const SurveyBuilder: React.FC<SurveyBuilderProps> = ({ survey, onSave, onCancel }) => {
  const [title, setTitle] = useState(survey?.title || '');
  const [description, setDescription] = useState(survey?.description || '');
  const [questions, setQuestions] = useState<Question[]>(survey?.questions || []);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [allowPublicAccess, setAllowPublicAccess] = useState(survey?.allowPublicAccess ?? true);
  const [responseLimit, setResponseLimit] = useState(survey?.responseLimit || '');
  const [expiresAt, setExpiresAt] = useState(survey?.expiresAt ? survey.expiresAt.split('T')[0] : '');
  const [showShareOptions, setShowShareOptions] = useState(false);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'text',
      title: 'New Question',
      required: false,
    };
    setQuestions([...questions, newQuestion]);
    setEditingQuestionId(newQuestion.id);
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    ));
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a survey title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    const surveyData: Survey = {
      id: survey?.id || Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      questions,
      createdAt: survey?.createdAt || new Date().toISOString(),
      isActive: survey?.isActive ?? true,
      publicId: survey?.publicId || generatePublicId(),
      allowPublicAccess,
      responseLimit: responseLimit ? parseInt(responseLimit) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    };

    storageUtils.saveSurvey(surveyData);
    onSave(surveyData);
  };

  const generatePublicId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const getPublicUrl = () => {
    const publicId = survey?.publicId || 'preview';
    return `${window.location.origin}/s/${publicId}`;
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(getPublicUrl());
    alert('Public link copied to clipboard!');
  };

  const renderQuestionEditor = (question: Question) => {
    const isEditing = editingQuestionId === question.id;

    return (
      <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={question.title}
                onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
                className="w-full text-lg font-medium bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                placeholder="Question title"
                autoFocus
              />
            ) : (
              <h3 className="text-lg font-medium text-gray-900">{question.title}</h3>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setEditingQuestionId(isEditing ? null : question.id)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
            </button>
            <button
              onClick={() => deleteQuestion(question.id)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {isEditing && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type
              </label>
              <select
                value={question.type}
                onChange={(e) => updateQuestion(question.id, { type: e.target.value as Question['type'] })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {questionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {question.type === 'multiple-choice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options
                </label>
                <div className="space-y-2">
                  {(question.options || []).map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(question.options || [])];
                          newOptions[index] = e.target.value;
                          updateQuestion(question.id, { options: newOptions });
                        }}
                        className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Option ${index + 1}`}
                      />
                      <button
                        onClick={() => {
                          const newOptions = (question.options || []).filter((_, i) => i !== index);
                          updateQuestion(question.id, { options: newOptions });
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newOptions = [...(question.options || []), ''];
                      updateQuestion(question.id, { options: newOptions });
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Option
                  </button>
                </div>
              </div>
            )}

            {question.type === 'rating' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Rating
                </label>
                <select
                  value={question.maxRating || 5}
                  onChange={(e) => updateQuestion(question.id, { maxRating: parseInt(e.target.value) })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={5}>5 Stars</option>
                  <option value={10}>10 Points</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuestion(question.id, { required: !question.required })}
                className={`p-2 rounded-lg transition-colors ${
                  question.required 
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {question.required ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </button>
              <span className="text-sm text-gray-700">Required</span>
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              Type: {questionTypes.find(t => t.value === question.type)?.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </p>
            {question.type === 'multiple-choice' && question.options && (
              <div className="space-y-1">
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 border border-gray-300 rounded-full"></div>
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {survey ? 'Edit Survey' : 'Create New Survey'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Save size={16} />
            Save Survey
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Survey Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter survey title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter survey description"
              />
            </div>
          </div>
        </div>

        {/* Public Access Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Public Access Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Allow Public Access</label>
                <p className="text-sm text-gray-500">Enable anyone with the link to respond</p>
              </div>
              <button
                onClick={() => setAllowPublicAccess(!allowPublicAccess)}
                className={`p-2 rounded-lg transition-colors ${
                  allowPublicAccess 
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {allowPublicAccess ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>

            {allowPublicAccess && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Response Limit (Optional)
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="number"
                        value={responseLimit}
                        onChange={(e) => setResponseLimit(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="No limit"
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiration Date (Optional)
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                </div>

                {survey && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Public Survey Link</label>
                        <p className="text-sm text-gray-500">Share this link to collect responses</p>
                      </div>
                      <button
                        onClick={() => setShowShareOptions(!showShareOptions)}
                        className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        <Share2 size={16} />
                        Share
                      </button>
                    </div>
                    
                    {showShareOptions && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={getPublicUrl()}
                            readOnly
                            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
                          />
                          <button
                            onClick={copyPublicUrl}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                          >
                            <Copy size={14} />
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {questions.map(renderQuestionEditor)}
        </div>

        <button
          onClick={addQuestion}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
        >
          <Plus size={20} />
          Add Question
        </button>
      </div>
    </div>
  );
};