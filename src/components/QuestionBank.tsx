import React, { useState, useMemo } from 'react';
import { Question, Taxonomy } from '../types';
import { Search, Plus, Filter, CheckCircle2, Circle, Trash2, Settings, Sparkles, Pencil, Download, Database, ChevronDown, ChevronUp, FileJson, FileSpreadsheet, CheckSquare, Square, X } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import AIGenerator from './AIGenerator';
import BoardImporter from './BoardImporter';
import { defaultTaxonomy } from '../data/defaultTaxonomy';

interface QuestionBankProps {
  bank: Question[];
  setBank: React.Dispatch<React.SetStateAction<Question[]>>;
  examQuestions: Question[];
  setExamQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  userUid: string;
  taxonomy: Taxonomy;
  onUpdateTaxonomy: (taxonomy: Taxonomy) => void;
  onNavigate: (view: any) => void;
}

export default function QuestionBank({ bank, setBank, examQuestions, setExamQuestions, userUid, taxonomy, onUpdateTaxonomy, onNavigate }: QuestionBankProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [chapterFilter, setChapterFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'difficulty' | 'subject'>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isManagingTaxonomy, setIsManagingTaxonomy] = useState(false);

  const [newQ, setNewQ] = useState<Partial<Question>>({
    text: '',
    options: { a: '', b: '', c: '', d: '' },
    answer: 'a',
    className: '',
    subject: '',
    chapter: '',
    difficulty: 'medium',
  });

  // Taxonomy Management State
  const [taxClass, setTaxClass] = useState('');
  const [taxSubject, setTaxSubject] = useState('');
  const [taxChapter, setTaxChapter] = useState('');

  const filteredBank = useMemo(() => {
    let result = bank.filter(q => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = q.text.toLowerCase().includes(searchLower) || 
                           (q.source && q.source.toLowerCase().includes(searchLower));
      const matchesClass = classFilter === 'All' || q.className === classFilter;
      const matchesSubject = subjectFilter === 'All' || q.subject === subjectFilter;
      const matchesChapter = chapterFilter === 'All' || q.chapter === chapterFilter;
      const matchesDifficulty = difficultyFilter === 'All' || q.difficulty === difficultyFilter;
      return matchesSearch && matchesClass && matchesSubject && matchesChapter && matchesDifficulty;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      if (sortBy === 'oldest') return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      if (sortBy === 'difficulty') {
        const order = { easy: 1, medium: 2, hard: 3 };
        return order[a.difficulty] - order[b.difficulty];
      }
      if (sortBy === 'subject') return a.subject.localeCompare(b.subject);
      return 0;
    });

    return result;
  }, [bank, searchTerm, classFilter, subjectFilter, chapterFilter, difficultyFilter, sortBy]);

  const handleSaveQuestion = async () => {
    if (!newQ.text || !newQ.className || !newQ.subject || !newQ.chapter) return;
    const questionId = editingId || crypto.randomUUID();
    const question: Question = {
      id: questionId,
      text: newQ.text!,
      options: newQ.options as Question['options'],
      answer: newQ.answer as Question['answer'],
      className: newQ.className!,
      subject: newQ.subject!,
      chapter: newQ.chapter!,
      difficulty: newQ.difficulty as Question['difficulty'],
      authorUid: userUid,
    };
    
    // Store previous state for rollback
    const previousBank = [...bank];
    const previousExamQuestions = [...examQuestions];

    // Optimistic update
    if (editingId) {
      setBank(bank.map(q => q.id === editingId ? question : q));
      setExamQuestions(examQuestions.map(q => q.id === editingId ? question : q));
    } else {
      setBank([question, ...bank]);
    }
    
    setIsAdding(false);
    setEditingId(null);
    setNewQ({
      text: '',
      options: { a: '', b: '', c: '', d: '' },
      answer: 'a',
      className: newQ.className,
      subject: newQ.subject,
      chapter: newQ.chapter,
      difficulty: 'medium',
    });

    try {
      const qRef = doc(db, `users/${userUid}/questions/${questionId}`);
      const payload: any = { ...question };
      if (!editingId) {
        payload.createdAt = serverTimestamp();
      } else {
        delete payload.id;
        delete payload.authorUid;
        delete payload.createdAt;
      }
      await setDoc(qRef, payload, { merge: true });
    } catch (error) {
      console.error("Error saving question:", error);
      // Revert optimistic update on error
      setBank(previousBank);
      setExamQuestions(previousExamQuestions);
    }
  };

  const handleEdit = (q: Question) => {
    setNewQ(q);
    setEditingId(q.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewQ({
      text: '',
      options: { a: '', b: '', c: '', d: '' },
      answer: 'a',
      className: '',
      subject: '',
      chapter: '',
      difficulty: 'medium',
    });
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
    if (!window.confirm('Are you sure you want to delete this question?')) return;
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} questions?`)) return;

    const previousBank = [...bank];
    const idsToDelete = Array.from(selectedIds);
    
    setBank(bank.filter(q => !selectedIds.has(q.id)));
    setExamQuestions(examQuestions.filter(q => !selectedIds.has(q.id)));
    setSelectedIds(new Set());

    try {
      const batch = writeBatch(db);
      idsToDelete.forEach(id => {
        const qRef = doc(db, `users/${userUid}/questions/${id}`);
        batch.delete(qRef);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error bulk deleting questions:", error);
      setBank(previousBank);
    }
  };

  const handleBulkAddToExam = () => {
    const selectedQuestions = bank.filter(q => selectedIds.has(q.id));
    const newQuestions = selectedQuestions.filter(sq => !examQuestions.some(eq => eq.id === sq.id));
    setExamQuestions([...examQuestions, ...newQuestions]);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBank.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBank.map(q => q.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const exportToJson = () => {
    const dataToExport = selectedIds.size > 0 
      ? bank.filter(q => selectedIds.has(q.id))
      : filteredBank;
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question-bank-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCsv = () => {
    const dataToExport = selectedIds.size > 0 
      ? bank.filter(q => selectedIds.has(q.id))
      : filteredBank;

    const headers = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer', 'Class', 'Subject', 'Chapter', 'Difficulty', 'Source'];
    const rows = dataToExport.map(q => [
      q.text,
      q.options.a,
      q.options.b,
      q.options.c,
      q.options.d,
      q.answer,
      q.className,
      q.subject,
      q.chapter,
      q.difficulty,
      q.source || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question-bank-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const total = bank.length;
    const easy = bank.filter(q => q.difficulty === 'easy').length;
    const medium = bank.filter(q => q.difficulty === 'medium').length;
    const hard = bank.filter(q => q.difficulty === 'hard').length;
    
    const subjects: Record<string, number> = {};
    bank.forEach(q => {
      subjects[q.subject] = (subjects[q.subject] || 0) + 1;
    });

    return { total, easy, medium, hard, subjects };
  }, [bank]);

  const findDuplicates = () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    
    bank.forEach(q => {
      const normalized = q.text.toLowerCase().trim().replace(/\s+/g, ' ');
      if (seen.has(normalized)) {
        duplicates.push(q.id);
      } else {
        seen.set(normalized, q.id);
      }
    });

    if (duplicates.length > 0) {
      setSelectedIds(new Set(duplicates));
      alert(`Found ${duplicates.length} potential duplicate questions. They have been selected for you.`);
    } else {
      alert('No duplicate questions found.');
    }
  };

  const saveTaxonomy = async (newTaxonomy: Taxonomy) => {
    onUpdateTaxonomy(newTaxonomy);
  };

  const addClass = () => {
    if (!taxClass || taxonomy.classes.includes(taxClass)) return;
    const newTax = { ...taxonomy, classes: [...taxonomy.classes, taxClass] };
    saveTaxonomy(newTax);
    setTaxClass('');
  };

  const addSubject = (className: string) => {
    if (!taxSubject) return;
    const currentSubjects = taxonomy.subjects[className] || [];
    if (currentSubjects.includes(taxSubject)) return;
    const newTax = {
      ...taxonomy,
      subjects: { ...taxonomy.subjects, [className]: [...currentSubjects, taxSubject] }
    };
    saveTaxonomy(newTax);
    setTaxSubject('');
  };

  const addChapter = (className: string, subjectName: string) => {
    if (!taxChapter) return;
    const key = `${className}_${subjectName}`;
    const currentChapters = taxonomy.chapters[key] || [];
    if (currentChapters.includes(taxChapter)) return;
    const newTax = {
      ...taxonomy,
      chapters: { ...taxonomy.chapters, [key]: [...currentChapters, taxChapter] }
    };
    saveTaxonomy(newTax);
    setTaxChapter('');
  };

  const deleteClass = (className: string) => {
    const newTax = {
      ...taxonomy,
      classes: taxonomy.classes.filter(c => c !== className),
    };
    // Clean up subjects and chapters
    const newSubjects = { ...newTax.subjects };
    delete newSubjects[className];
    newTax.subjects = newSubjects;
    
    const newChapters = { ...newTax.chapters };
    Object.keys(newChapters).forEach(k => {
      if (k.startsWith(`${className}_`)) delete newChapters[k];
    });
    newTax.chapters = newChapters;
    
    saveTaxonomy(newTax);
  };

  const deleteSubject = (className: string, subjectName: string) => {
    const newTax = { ...taxonomy };
    if (newTax.subjects[className]) {
      newTax.subjects[className] = newTax.subjects[className].filter(s => s !== subjectName);
    }
    const key = `${className}_${subjectName}`;
    if (newTax.chapters[key]) {
      delete newTax.chapters[key];
    }
    saveTaxonomy(newTax);
  };

  const deleteChapter = (className: string, subjectName: string, chapterName: string) => {
    const key = `${className}_${subjectName}`;
    const newTax = { ...taxonomy };
    if (newTax.chapters[key]) {
      newTax.chapters[key] = newTax.chapters[key].filter(c => c !== chapterName);
    }
    saveTaxonomy(newTax);
  };

  const handleImportDefaultTaxonomy = () => {
    if (window.confirm('This will replace your current classes, subjects, and chapters with the default Bangladesh National Curriculum data. Continue?')) {
      saveTaxonomy(defaultTaxonomy);
    }
  };

  const handleAddMultipleQuestions = async (questions: Question[]) => {
    // Optimistic update
    setBank(prev => [...questions, ...prev]);
    
    // Save to Firestore
    try {
      const promises = questions.map(q => {
        const qRef = doc(db, `users/${userUid}/questions/${q.id}`);
        return setDoc(qRef, {
          ...q,
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(promises);
    } catch (error) {
      console.error("Error adding generated questions:", error);
      // Revert optimistic update on error by refetching or just removing the added ones
      // For simplicity, we'll let the onSnapshot listener handle the sync eventually, 
      // but a proper rollback would filter out the new IDs.
      const newIds = new Set(questions.map(q => q.id));
      setBank(prev => prev.filter(q => !newIds.has(q.id)));
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Question Bank</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-zinc-400">Manage your repository of questions</p>
            <div className="h-4 w-[1px] bg-zinc-800" />
            <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider">
              <span className="text-emerald-400">{stats.easy} Easy</span>
              <span className="text-amber-400">{stats.medium} Medium</span>
              <span className="text-red-400">{stats.hard} Hard</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsManagingTaxonomy(!isManagingTaxonomy)}
            className="flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-700 transition-colors"
          >
            <Settings size={18} />
            Manage Classes
          </button>
          <button
            onClick={findDuplicates}
            className="flex items-center gap-2 bg-zinc-800 text-zinc-400 px-4 py-2 rounded-lg font-medium hover:bg-zinc-700 hover:text-white transition-colors"
            title="Find duplicate questions"
          >
            <Database size={18} />
            Find Duplicates
          </button>
          <button
            onClick={() => onNavigate('board-importer')}
            className="flex items-center gap-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg font-medium hover:bg-blue-600/30 transition-colors"
          >
            <Download size={18} />
            Board Questions
          </button>
          <button
            onClick={() => onNavigate('ai-generator')}
            className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg font-medium hover:bg-emerald-600/30 transition-colors"
          >
            <Sparkles size={18} />
            Generate with AI
          </button>
          <button
            onClick={() => isAdding ? handleCancelEdit() : setIsAdding(true)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            <Plus size={18} />
            {isAdding ? 'Cancel' : 'New Question'}
          </button>
        </div>
      </div>

      {/* Modals removed as they are now separate pages */}

      {isManagingTaxonomy && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Manage Classes, Subjects & Chapters</h2>
            <button
              onClick={handleImportDefaultTaxonomy}
              className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-600/30 transition-colors"
            >
              <Database size={14} />
              Import Default Curriculum
            </button>
          </div>
          
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={taxClass}
              onChange={e => setTaxClass(e.target.value)}
              placeholder="New Class Name (e.g. Class 10)"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
            />
            <button onClick={addClass} className="bg-zinc-800 text-white px-4 py-2 rounded-lg hover:bg-zinc-700">Add Class</button>
          </div>

          <div className="space-y-6">
            {taxonomy.classes.map(cls => (
              <div key={cls} className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-emerald-400">{cls}</h3>
                  <button onClick={() => deleteClass(cls)} className="text-zinc-500 hover:text-red-400"><Trash2 size={16}/></button>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={taxSubject}
                    onChange={e => setTaxSubject(e.target.value)}
                    placeholder={`New Subject for ${cls}`}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                  />
                  <button onClick={() => addSubject(cls)} className="bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-700">Add Subject</button>
                </div>

                <div className="space-y-4 pl-4 border-l border-zinc-800">
                  {(taxonomy.subjects[cls] || []).map(sub => (
                    <div key={sub} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-md font-medium text-amber-400">{sub}</h4>
                        <button onClick={() => deleteSubject(cls, sub)} className="text-zinc-500 hover:text-red-400"><Trash2 size={14}/></button>
                      </div>
                      
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={taxChapter}
                          onChange={e => setTaxChapter(e.target.value)}
                          placeholder={`New Chapter for ${sub}`}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-zinc-600"
                        />
                        <button onClick={() => addChapter(cls, sub)} className="bg-zinc-800 text-white px-3 py-1 rounded-lg text-sm hover:bg-zinc-700">Add Chapter</button>
                      </div>

                      <div className="flex flex-wrap gap-2 pl-4">
                        {(taxonomy.chapters[`${cls}_${sub}`] || []).map(chap => (
                          <div key={chap} className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-md text-xs text-zinc-300">
                            <span>{chap}</span>
                            <button onClick={() => deleteChapter(cls, sub, chap)} className="text-zinc-500 hover:text-red-400 ml-1"><Trash2 size={12}/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">
            {editingId ? 'Edit Question' : 'Add New Question'}
          </h2>
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
              <label className="block text-sm font-medium text-zinc-400 mb-1">Class</label>
              <select
                value={newQ.className}
                onChange={(e) => setNewQ({ ...newQ, className: e.target.value, subject: '', chapter: '' })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600 appearance-none"
              >
                <option value="">Select Class</option>
                {taxonomy.classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Subject</label>
              <select
                value={newQ.subject}
                onChange={(e) => setNewQ({ ...newQ, subject: e.target.value, chapter: '' })}
                disabled={!newQ.className}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600 appearance-none disabled:opacity-50"
              >
                <option value="">Select Subject</option>
                {(newQ.className ? taxonomy.subjects[newQ.className] || [] : []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Chapter</label>
              <select
                value={newQ.chapter}
                onChange={(e) => setNewQ({ ...newQ, chapter: e.target.value })}
                disabled={!newQ.subject}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600 appearance-none disabled:opacity-50"
              >
                <option value="">Select Chapter</option>
                {(newQ.className && newQ.subject ? taxonomy.chapters[`${newQ.className}_${newQ.subject}`] || [] : []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleCancelEdit}
              className="px-6 py-2 rounded-lg font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveQuestion}
              disabled={!newQ.text || !newQ.className || !newQ.subject || !newQ.chapter}
              className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? 'Update Question' : 'Save Question'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-zinc-600"
          />
        </div>
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
            <Filter size={16} className="text-zinc-500" />
            <select
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setSubjectFilter('All'); setChapterFilter('All'); }}
              className="bg-transparent text-white text-sm focus:outline-none appearance-none min-w-[100px]"
            >
              <option value="All">All Classes</option>
              {taxonomy.classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
            <select
              value={subjectFilter}
              onChange={(e) => { setSubjectFilter(e.target.value); setChapterFilter('All'); }}
              disabled={classFilter === 'All'}
              className="bg-transparent text-white text-sm focus:outline-none appearance-none min-w-[100px] disabled:opacity-50"
            >
              <option value="All">All Subjects</option>
              {(classFilter !== 'All' ? taxonomy.subjects[classFilter] || [] : []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none appearance-none min-w-[100px]"
            >
              <option value="All">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
            <span className="text-xs text-zinc-500 font-bold uppercase">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white text-sm focus:outline-none appearance-none min-w-[100px]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="difficulty">Difficulty</option>
              <option value="subject">Subject</option>
            </select>
          </div>
          {(classFilter !== 'All' || subjectFilter !== 'All' || chapterFilter !== 'All' || difficultyFilter !== 'All' || searchTerm) && (
            <button 
              onClick={() => {
                setClassFilter('All');
                setSubjectFilter('All');
                setChapterFilter('All');
                setDifficultyFilter('All');
                setSearchTerm('');
              }}
              className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
            >
              <X size={14} />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-xl p-4 mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-emerald-400">{selectedIds.size} selected</span>
            <div className="h-4 w-[1px] bg-zinc-800" />
            <button 
              onClick={handleBulkAddToExam}
              className="text-xs font-bold text-white hover:text-emerald-400 transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} />
              Add to Exam
            </button>
            <button 
              onClick={handleBulkDelete}
              className="text-xs font-bold text-white hover:text-red-400 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Delete Selected
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToJson}
              className="text-xs font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <FileJson size={14} />
              JSON
            </button>
            <button 
              onClick={exportToCsv}
              className="text-xs font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet size={14} />
              CSV
            </button>
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-bold text-zinc-500 hover:text-white transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors"
          >
            {selectedIds.size === filteredBank.length && filteredBank.length > 0 ? (
              <CheckSquare size={16} className="text-emerald-500" />
            ) : (
              <Square size={16} />
            )}
            Select All Visible
          </button>
          <span className="text-xs text-zinc-600">({filteredBank.length} questions)</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportToJson} className="text-xs font-bold text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredBank.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            No questions found matching your criteria.
          </div>
        ) : (
          filteredBank.map((q) => {
            const isSelectedForExam = examQuestions.some(eq => eq.id === q.id);
            const isChecked = selectedIds.has(q.id);
            return (
              <div key={q.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${isChecked ? 'bg-emerald-500/5 border-emerald-500/30' : isSelectedForExam ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                <div className="flex flex-col gap-3 mt-1">
                  <button
                    onClick={() => toggleSelect(q.id)}
                    className="flex-shrink-0 text-zinc-600 hover:text-white transition-colors"
                  >
                    {isChecked ? <CheckSquare className="text-emerald-500" size={20} /> : <Square size={20} />}
                  </button>
                  <button
                    onClick={() => toggleExamQuestion(q)}
                    className="flex-shrink-0 text-zinc-600 hover:text-white transition-colors"
                  >
                    {isSelectedForExam ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Circle size={20} />}
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-white text-lg">{q.text}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(q)} className="text-zinc-600 hover:text-blue-400 transition-colors" title="Edit Question">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => handleDelete(q.id)} className="text-zinc-600 hover:text-red-400 transition-colors" title="Delete Question">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 mb-3 flex-wrap">
                    <span className="text-xs font-medium px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md">{q.className}</span>
                    <span className="text-xs font-medium px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md">{q.subject}</span>
                    <span className="text-xs font-medium px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md">{q.chapter}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                      q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                      q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                    </span>
                    {q.source && (
                      <span className="text-xs font-bold px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md uppercase">
                        {q.source}
                      </span>
                    )}
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
