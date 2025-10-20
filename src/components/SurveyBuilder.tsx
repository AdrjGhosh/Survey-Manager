import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Eye, Settings, GripVertical } from 'lucide-react';
import { Survey, Question } from '../types/survey';
import { databaseUtils } from '../utils/database';
import { User } from '../types/auth';

// Generate a proper UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface SurveyBuilderProps {
  survey?: Survey;
  onSave: (survey: Survey) => void;
  onCancel: () => void;
  user: User | null;
}

export const SurveyBuilder: React.FC<SurveyBuilderProps> = ({ survey, onSave, onCancel, user }) => {
  const [title, setTitle] = useState(survey?.title || '');
  const [description, setDescription] = useState(survey?.description || '');
  const [questions, setQuestions] = useState<Question[]>(survey?.questions || []);
  const [isActive, setIsActive] = useState(survey?.isActive ?? true);
  const [allowPublicAccess, setAllowPublicAccess] = useState(survey?.allowPublicAccess ?? true);
  const [responseLimit, setResponseLimit] = useState<number | undefined>(survey?.responseLimit);
  const [expiresAt, setExpiresAt] = useState(survey?.expiresAt || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: generateUUID(),
      type: 'text',
      title: '',
      required: false,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    ));
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === questionId);
    if (
      (direction === 'up' && index > 0) ||
      (direction === 'down' && index < questions.length - 1)
    ) {
      const newQuestions = [...questions];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
      setQuestions(newQuestions);
    }
  };

  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && (question.type === 'multiple-choice' || question.type === 'multiple-select')) {
      const options = question.options || [];
      updateQuestion(questionId, { options: [...options, ''] });
    }
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options) {
      const newOptions = [...question.options];
      newOptions[optionIndex] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const deleteOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options) {
      const newOptions = question.options.filter((_, index) => index !== optionIndex);
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a survey title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    // Validate questions
    for (const question of questions) {
      if (!question.title.trim()) {
        alert('Please fill in all question titles');
        return;
      }
      if ((question.type === 'multiple-choice' || question.type === 'multiple-select') && (!question.options || question.options.length < 2)) {
        alert('Multiple choice questions must have at least 2 options');
        return;
      }
    }

    setIsSaving(true);
    try {
      const surveyData: Survey = {
        id: survey?.id || generateUUID(),
        publicId: survey?.publicId || generateUUID(),
        title: title.trim(),
        description: description.trim(),
        questions,
        isActive,
        allowPublicAccess,
        responseLimit: responseLimit || undefined,
        expiresAt: expiresAt || undefined,
        createdAt: survey?.createdAt || new Date().toISOString(),
      };

      await databaseUtils.saveSurvey(surveyData, user || undefined);
      onSave(surveyData);
    } catch (error) {
      console.error('Failed to save survey:', error);
      alert('Failed to save survey. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderQuestionEditor = (question: Question, index: number) => {
    return (
      <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
            <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => moveQuestion(question.id, 'up')}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              ↑
            </button>
            <button
              onClick={() => moveQuestion(question.id, 'down')}
              disabled={index === questions.length - 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              ↓
            </button>
            <button
              onClick={() => deleteQuestion(question.id)}
              className="p-1 text-red-500 hover:text-red-700"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Title *
            </label>
            <input
              type="text"
              value={question.title}
              onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your question"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type
              </label>
              <select
                value={question.type}
                onChange={(e) => updateQuestion(question.id, { 
                  type: e.target.value as Question['type'],
                  options: (e.target.value === 'multiple-choice' || e.target.value === 'multiple-select') ? ['Option 1', 'Option 2'] : undefined
                })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="text">Short Text</option>
                <option value="textarea">Long Text</option>
                <option value="email">Email</option>
                <option value="number">Number</option>
                <option value="multiple-choice">Multiple Choice (Single)</option>
                <option value="multiple-select">Multiple Choice (Multiple)</option>
                <option value="rating">Rating</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Required</span>
              </label>
            </div>
          </div>

          {(question.type === 'multiple-choice' || question.type === 'multiple-select') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {question.options?.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Option ${optionIndex + 1}`}
                    />
                    <button
                      onClick={() => deleteOption(question.id, optionIndex)}
                      className="p-2 text-red-500 hover:text-red-700"
                      disabled={question.options!.length <= 2}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addOption(question.id)}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Add Option
                </button>
              </div>
            </div>
          )}

          {question.type === 'rating' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Rating
              </label>
              <input
                type="number"
                min="3"
                max="10"
                value={question.maxRating || 5}
                onChange={(e) => updateQuestion(question.id, { maxRating: parseInt(e.target.value) })}
                className="w-24 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (showPreview) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setShowPreview(false)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title || 'Untitled Survey'}</h1>
            <p className="text-gray-600">Preview Mode</p>
          </div>
        </div>

        <div className="space-y-6">
          {description && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">{description}</p>
            </div>
          )}

          {questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {question.title}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </h3>

              {question.type === 'text' && (
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="Your answer"
                  disabled
                />
              )}

              {question.type === 'textarea' && (
                <textarea
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-y"
                  placeholder="Your answer"
                  disabled
                />
              )}

              {question.type === 'email' && (
                <input
                  type="email"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="your.email@example.com"
                  disabled
                />
              )}

              {question.type === 'number' && (
                <input
                  type="number"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="Enter a number"
                  disabled
                />
              )}

              {question.type === 'multiple-choice' && (
                <div className="space-y-3">
                  {question.options?.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name={`preview-${question.id}`}
                        className="w-4 h-4 text-blue-600"
                        disabled
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'multiple-select' && (
                <div className="space-y-3">
                  {question.options?.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded"
                        disabled
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'rating' && (
                <div className="flex items-center gap-2">
                  {Array.from({ length: question.maxRating || 5 }).map((_, ratingIndex) => (
                    <button
                      key={ratingIndex}
                      className="w-10 h-10 rounded-full border-2 border-gray-300 text-gray-400 font-medium"
                      disabled
                    >
                      {ratingIndex + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {survey ? 'Edit Survey' : 'Create Survey'}
            </h1>
            <p className="text-gray-600">Build your survey with custom questions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye size={16} />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Survey'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Survey Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Survey Settings</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Survey Title *
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
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                placeholder="Describe your survey"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Survey is active</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowPublicAccess}
                    onChange={(e) => setAllowPublicAccess(e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Allow public access</span>
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Response Limit (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={responseLimit || ''}
                    onChange={(e) => setResponseLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="No limit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expires At (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
            <button
              onClick={addQuestion}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Plus size={16} />
              Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 mb-4">No questions added yet</p>
              <button
                onClick={addQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mx-auto"
              >
                <Plus size={16} />
                Add Your First Question
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((question, index) => renderQuestionEditor(question, index))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};