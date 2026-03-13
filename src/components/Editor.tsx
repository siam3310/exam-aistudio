import React, { useState } from 'react';
import { ExamDetails, Question } from '../types';
import { Trash2, Settings, FileText, Save } from 'lucide-react';

interface EditorProps {
  examDetails: ExamDetails;
  setExamDetails: React.Dispatch<React.SetStateAction<ExamDetails>>;
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  onPreview: () => void;
  onSave: () => void;
}

export default function Editor({ examDetails, setExamDetails, questions, setQuestions, onPreview, onSave }: EditorProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'questions'>('details');

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleQuestionChange = (id: string, field: keyof Question, value: any) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          return { ...q, [field]: value };
        }
        return q;
      })
    );
  };

  const handleOptionChange = (id: string, optionKey: keyof Question['options'], value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          return { ...q, options: { ...q.options, [optionKey]: value } };
        }
        return q;
      })
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Exam Editor</h1>
          <p className="text-zinc-400 mt-1">Configure exam details and review selected questions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-700 transition-colors"
          >
            <Save size={18} />
            Save Exam
          </button>
          <button
            onClick={onPreview}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            <FileText size={18} />
            Preview & Export
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'details' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Settings size={18} />
          Exam Details
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'questions' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <FileText size={18} />
          Selected Questions ({questions.length})
        </button>
      </div>

      {activeTab === 'details' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Institution Name</label>
              <input
                type="text"
                value={examDetails.institutionName}
                onChange={(e) => setExamDetails({ ...examDetails, institutionName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                placeholder="e.g. Dhaka College"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Exam Name</label>
              <input
                type="text"
                value={examDetails.examName}
                onChange={(e) => setExamDetails({ ...examDetails, examName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                placeholder="e.g. Annual Examination - 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Class</label>
              <input
                type="text"
                value={examDetails.className}
                onChange={(e) => setExamDetails({ ...examDetails, className: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                placeholder="e.g. Class 10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Subject</label>
              <input
                type="text"
                value={examDetails.subject}
                onChange={(e) => setExamDetails({ ...examDetails, subject: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                placeholder="e.g. General Knowledge"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Full Marks</label>
              <input
                type="text"
                value={examDetails.fullMarks}
                onChange={(e) => setExamDetails({ ...examDetails, fullMarks: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                placeholder="e.g. 30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Date</label>
              <input
                type="text"
                value={examDetails.date}
                onChange={(e) => setExamDetails({ ...examDetails, date: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                placeholder="e.g. 15/05/2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Time</label>
              <input
                type="text"
                value={examDetails.time}
                onChange={(e) => setExamDetails({ ...examDetails, time: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                placeholder="e.g. 30 Minutes"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
              No questions selected. Go to the Question Bank to add some.
            </div>
          ) : (
            questions.map((q, index) => (
              <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-white">Question {index + 1}</h3>
                  <button
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                    title="Remove from Exam"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                      placeholder="Enter question text..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                      <div key={opt} className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 font-medium text-sm uppercase">
                          {opt}
                        </div>
                        <input
                          type="text"
                          value={q.options[opt]}
                          onChange={(e) => handleOptionChange(q.id, opt, e.target.value)}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                          placeholder={`Option ${opt.toUpperCase()}`}
                        />
                        <input
                          type="radio"
                          name={`answer-${q.id}`}
                          checked={q.answer === opt}
                          onChange={() => handleQuestionChange(q.id, 'answer', opt)}
                          className="w-4 h-4 text-white bg-zinc-900 border-zinc-700 focus:ring-white focus:ring-2"
                          title="Mark as correct answer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
