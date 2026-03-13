import React, { useState, useMemo } from 'react';
import { Question } from '../types';
import { Search, Plus, Filter, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface QuestionBankProps {
  bank: Question[];
  setBank: React.Dispatch<React.SetStateAction<Question[]>>;
  examQuestions: Question[];
  setExamQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  userUid: string;
}

export default function QuestionBank({ bank, setBank, examQuestions, setExamQuestions, userUid }: QuestionBankProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);

  const [newQ, setNewQ] = useState<Partial<Question>>({
    text: '',
    options: { a: '', b: '', c: '', d: '' },
    answer: 'a',
    subject: '',
    difficulty: 'medium',
  });

  const subjects = useMemo(() => {
    const subs = new Set(bank.map(q => q.subject));
    return ['All', ...Array.from(subs).filter(Boolean)];
  }, [bank]);

  const filteredBank = useMemo(() => {
    return bank.filter(q => {
      const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = subjectFilter === 'All' || q.subject === subjectFilter;
      const matchesDifficulty = difficultyFilter === 'All' || q.difficulty === difficultyFilter;
      return matchesSearch && matchesSubject && matchesDifficulty;
    });
  }, [bank, searchTerm, subjectFilter, difficultyFilter]);

  const handleAddQuestion = async () => {
    if (!newQ.text || !newQ.subject) return;
    const questionId = crypto.randomUUID();
    const question: Question = {
      id: questionId,
      text: newQ.text!,
      options: newQ.options as Question['options'],
      answer: newQ.answer as Question['answer'],
      subject: newQ.subject!,
      difficulty: newQ.difficulty as Question['difficulty'],
      authorUid: userUid,
    };
    
    // Optimistic update
    setBank([question, ...bank]);
    setIsAdding(false);
    setNewQ({
      text: '',
      options: { a: '', b: '', c: '', d: '' },
      answer: 'a',
      subject: newQ.subject, // Keep the last used subject
      difficulty: 'medium',
    });

    try {
      const qRef = doc(db, `users/${userUid}/questions/${questionId}`);
      await setDoc(qRef, {
        ...question,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding question:", error);
      // Revert optimistic update on error
      setBank(bank.filter(q => q.id !== questionId));
    }
  };

  const toggleExamQuestion = (q: Question) => {
    const exists = examQuestions.find(eq => eq.id === q.id);
    if (exists) {
      setExamQuestions(examQuestions.filter(eq => eq.id !== q.id));
    } else {
      setExamQuestions([...examQuestions, q]);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    const previousBank = [...bank];
    setBank(bank.filter(q => q.id !== id));
    setExamQuestions(examQuestions.filter(q => q.id !== id));

    try {
      const qRef = doc(db, `users/${userUid}/questions/${id}`);
      await deleteDoc(qRef);
    } catch (error) {
      console.error("Error deleting question:", error);
      // Revert optimistic update on error
      setBank(previousBank);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Question Bank</h1>
          <p className="text-zinc-400 mt-1">Manage your repository of questions</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
        >
          <Plus size={18} />
          {isAdding ? 'Cancel' : 'New Question'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">Add New Question</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Question Text</label>
              <input
                type="text"
                value={newQ.text}
                onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                placeholder="Enter question..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Subject</label>
              <input
                type="text"
                value={newQ.subject}
                onChange={(e) => setNewQ({ ...newQ, subject: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                placeholder="e.g. Mathematics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Difficulty</label>
              <select
                value={newQ.difficulty}
                onChange={(e) => setNewQ({ ...newQ, difficulty: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600 appearance-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {(['a', 'b', 'c', 'd'] as const).map((opt) => (
              <div key={opt} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 font-medium text-sm uppercase">
                  {opt}
                </div>
                <input
                  type="text"
                  value={newQ.options?.[opt]}
                  onChange={(e) => setNewQ({ ...newQ, options: { ...newQ.options!, [opt]: e.target.value } })}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                  placeholder={`Option ${opt.toUpperCase()}`}
                />
                <input
                  type="radio"
                  name="correct-answer"
                  checked={newQ.answer === opt}
                  onChange={() => setNewQ({ ...newQ, answer: opt })}
                  className="w-4 h-4 text-white bg-zinc-900 border-zinc-700 focus:ring-white focus:ring-2"
                  title="Mark as correct answer"
                />
              </div>
            ))}
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={handleAddQuestion}
              disabled={!newQ.text || !newQ.subject}
              className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Question
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-zinc-600"
          />
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-8 py-2 text-white focus:outline-none focus:border-zinc-600 appearance-none min-w-[150px]"
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600 appearance-none min-w-[120px]"
          >
            <option value="All">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredBank.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            No questions found matching your criteria.
          </div>
        ) : (
          filteredBank.map((q) => {
            const isSelected = examQuestions.some(eq => eq.id === q.id);
            return (
              <div key={q.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${isSelected ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                <button
                  onClick={() => toggleExamQuestion(q)}
                  className="mt-1 flex-shrink-0 text-zinc-400 hover:text-white transition-colors"
                >
                  {isSelected ? <CheckCircle2 className="text-emerald-500" size={24} /> : <Circle size={24} />}
                </button>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-white text-lg">{q.text}</p>
                    <button onClick={() => handleDelete(q.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2 mb-3">
                    <span className="text-xs font-medium px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md">{q.subject}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                      q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                      q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-zinc-400">
                    <span className={q.answer === 'a' ? 'text-emerald-400 font-medium' : ''}>(ক) {q.options.a}</span>
                    <span className={q.answer === 'b' ? 'text-emerald-400 font-medium' : ''}>(খ) {q.options.b}</span>
                    <span className={q.answer === 'c' ? 'text-emerald-400 font-medium' : ''}>(গ) {q.options.c}</span>
                    <span className={q.answer === 'd' ? 'text-emerald-400 font-medium' : ''}>(ঘ) {q.options.d}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
