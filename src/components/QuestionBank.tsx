import React, { useState, useMemo } from 'react';
import { Question, Taxonomy } from '../types';
import { Search, Plus, Filter, CheckCircle2, Circle, Trash2, Settings, Sparkles, Pencil, Download } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import AIGenerator from './AIGenerator';
import BoardImporter from './BoardImporter';

interface QuestionBankProps {
  bank: Question[];
  setBank: React.Dispatch<React.SetStateAction<Question[]>>;
  examQuestions: Question[];
  setExamQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  userUid: string;
  taxonomy: Taxonomy;
}

export default function QuestionBank({ bank, setBank, examQuestions, setExamQuestions, userUid, taxonomy }: QuestionBankProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [chapterFilter, setChapterFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isManagingTaxonomy, setIsManagingTaxonomy] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [isBoardImporterOpen, setIsBoardImporterOpen] = useState(false);

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
    return bank.filter(q => {
      const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = classFilter === 'All' || q.className === classFilter;
      const matchesSubject = subjectFilter === 'All' || q.subject === subjectFilter;
      const matchesChapter = chapterFilter === 'All' || q.chapter === chapterFilter;
      const matchesDifficulty = difficultyFilter === 'All' || q.difficulty === difficultyFilter;
      return matchesSearch && matchesClass && matchesSubject && matchesChapter && matchesDifficulty;
    });
  }, [bank, searchTerm, classFilter, subjectFilter, chapterFilter, difficultyFilter]);

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

  const saveTaxonomy = async (newTaxonomy: Taxonomy) => {
    try {
      await setDoc(doc(db, `users/${userUid}/settings/taxonomy`), newTaxonomy);
    } catch (error) {
      console.error("Error saving taxonomy:", error);
    }
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
          <p className="text-zinc-400 mt-1">Manage your repository of questions</p>
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
            onClick={() => setIsBoardImporterOpen(true)}
            className="flex items-center gap-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg font-medium hover:bg-blue-600/30 transition-colors"
          >
            <Download size={18} />
            Board Questions
          </button>
          <button
            onClick={() => setIsAIGeneratorOpen(true)}
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

      {isAIGeneratorOpen && (
        <AIGenerator
          taxonomy={taxonomy}
          userUid={userUid}
          onAddQuestions={handleAddMultipleQuestions}
          onClose={() => setIsAIGeneratorOpen(false)}
        />
      )}

      {isBoardImporterOpen && (
        <BoardImporter
          taxonomy={taxonomy}
          userUid={userUid}
          onAddQuestions={handleAddMultipleQuestions}
          onClose={() => setIsBoardImporterOpen(false)}
        />
      )}

      {isManagingTaxonomy && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Manage Classes, Subjects & Chapters</h2>
          
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
        <div className="flex gap-4 flex-wrap">
          <select
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setSubjectFilter('All'); setChapterFilter('All'); }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600 appearance-none min-w-[120px]"
          >
            <option value="All">All Classes</option>
            {taxonomy.classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={subjectFilter}
            onChange={(e) => { setSubjectFilter(e.target.value); setChapterFilter('All'); }}
            disabled={classFilter === 'All'}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600 appearance-none min-w-[120px] disabled:opacity-50"
          >
            <option value="All">All Subjects</option>
            {(classFilter !== 'All' ? taxonomy.subjects[classFilter] || [] : []).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={chapterFilter}
            onChange={(e) => setChapterFilter(e.target.value)}
            disabled={subjectFilter === 'All'}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600 appearance-none min-w-[120px] disabled:opacity-50"
          >
            <option value="All">All Chapters</option>
            {(classFilter !== 'All' && subjectFilter !== 'All' ? taxonomy.chapters[`${classFilter}_${subjectFilter}`] || [] : []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
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
