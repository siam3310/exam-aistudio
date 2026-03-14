import React, { useState, useEffect } from 'react';
import { Exam, Question, Taxonomy } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import { BookOpen, FileText, Library, Users, Sparkles, ArrowRight, Plus, Database, Download, Search, ChevronRight, Pencil } from 'lucide-react';
import { defaultTaxonomy } from '../data/defaultTaxonomy';

interface DashboardProps {
  userUid: string;
  userName: string;
  bank: Question[];
  taxonomy: Taxonomy;
  onNavigate: (view: 'bank' | 'editor' | 'preview' | 'saved' | 'ai-generator' | 'board-importer') => void;
  onLoadExam: (exam: Exam) => void;
}

export default function Dashboard({ userUid, userName, bank, taxonomy, onNavigate, onLoadExam }: DashboardProps) {
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [totalExams, setTotalExams] = useState(0);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    const examsPath = `users/${userUid}/exams`;
    const q = query(collection(db, examsPath), orderBy('createdAt', 'desc'), limit(3));
    
    const qAll = query(collection(db, examsPath));
    
    const unsubscribeRecent = onSnapshot(q, (snapshot) => {
      const examsData: Exam[] = [];
      snapshot.forEach((doc) => {
        examsData.push({ id: doc.id, ...doc.data() } as Exam);
      });
      setRecentExams(examsData);
    });

    const unsubscribeAll = onSnapshot(qAll, (snapshot) => {
      setTotalExams(snapshot.size);
    });

    return () => {
      unsubscribeRecent();
      unsubscribeAll();
    };
  }, [userUid]);

  const totalClasses = taxonomy.classes.length;
  const totalSubjects = Object.values(taxonomy.subjects).reduce((acc, curr) => acc + curr.length, 0);

  const handleSeedData = async () => {
    try {
      await setDoc(doc(db, `users/${userUid}/settings/taxonomy`), defaultTaxonomy);
      alert('Database seeded with Bangladesh National Curriculum data successfully!');
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Failed to seed data.');
    }
  };

  const getSubjectStats = (className: string, subjectName: string) => {
    const questions = bank.filter(q => q.className === className && q.subject === subjectName);
    return {
      count: questions.length,
      easy: questions.filter(q => q.difficulty === 'easy').length,
      medium: questions.filter(q => q.difficulty === 'medium').length,
      hard: questions.filter(q => q.difficulty === 'hard').length,
    };
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Welcome back, {userName}!</h1>
          <p className="text-zinc-400 mt-2 text-lg">Your hierarchical curriculum management dashboard.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('editor')}
            className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold hover:bg-zinc-200 transition-all shadow-lg"
          >
            <Plus size={18} />
            New Exam
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Total Questions</h3>
            <Library size={18} className="text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{bank.length}</span>
            <span className="text-zinc-500 text-sm">items</span>
          </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Saved Exams</h3>
            <FileText size={18} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{totalExams}</span>
            <span className="text-zinc-500 text-sm">papers</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Classes</h3>
            <Users size={18} className="text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{totalClasses}</span>
            <span className="text-zinc-500 text-sm">levels</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Subjects</h3>
            <BookOpen size={18} className="text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{totalSubjects}</span>
            <span className="text-zinc-500 text-sm">courses</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Hierarchical Curriculum Explorer */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Database size={24} className="text-emerald-400" />
              Curriculum Explorer
            </h2>
            {totalClasses === 0 && (
              <button 
                onClick={handleSeedData}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider flex items-center gap-1"
              >
                <Plus size={14} />
                Seed Curriculum
              </button>
            )}
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-md">
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
              {/* Classes Sidebar */}
              <div className="md:col-span-4 border-r border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-4">Select Class</h3>
                {taxonomy.classes.length === 0 ? (
                  <p className="text-zinc-600 text-sm italic px-2">No classes found.</p>
                ) : (
                  taxonomy.classes.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedClass(c)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                        selectedClass === c 
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <span className="font-medium">{c}</span>
                      <ArrowRight size={16} className={selectedClass === c ? 'opacity-100' : 'opacity-0'} />
                    </button>
                  ))
                )}
              </div>

              {/* Subjects Content */}
              <div className="md:col-span-8 p-6">
                {!selectedClass ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600">
                      <ArrowRight size={32} className="rotate-180" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Select a Class</h3>
                      <p className="text-zinc-500 text-sm max-w-xs">Pick a class from the left to explore subjects and question statistics.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-white">{selectedClass} Subjects</h3>
                      <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full uppercase tracking-wider">
                        {taxonomy.subjects[selectedClass]?.length || 0} Subjects
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(taxonomy.subjects[selectedClass] || []).map(s => {
                        const stats = getSubjectStats(selectedClass, s);
                        return (
                          <div key={s} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all group">
                            <div className="flex items-start justify-between mb-4">
                              <h4 className="font-bold text-white text-lg group-hover:text-emerald-400 transition-colors">{s}</h4>
                              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500">
                                <BookOpen size={16} />
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex-1">
                                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase mb-1">
                                  <span>Questions</span>
                                  <span>{stats.count}</span>
                                </div>
                                <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 rounded-full" 
                                    style={{ width: `${Math.min(100, (stats.count / 50) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-zinc-900/50 rounded-lg py-2">
                                <p className="text-[10px] font-bold text-zinc-600 uppercase">Easy</p>
                                <p className="text-sm font-bold text-emerald-400">{stats.easy}</p>
                              </div>
                              <div className="bg-zinc-900/50 rounded-lg py-2">
                                <p className="text-[10px] font-bold text-zinc-600 uppercase">Med</p>
                                <p className="text-sm font-bold text-amber-400">{stats.medium}</p>
                              </div>
                              <div className="bg-zinc-900/50 rounded-lg py-2">
                                <p className="text-[10px] font-bold text-zinc-600 uppercase">Hard</p>
                                <p className="text-sm font-bold text-red-400">{stats.hard}</p>
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-zinc-900 flex gap-2">
                              <button 
                                onClick={() => onNavigate('ai-generator')}
                                className="flex-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase py-2 text-center border border-emerald-500/20 rounded-lg hover:bg-emerald-500/5 transition-all"
                              >
                                AI Gen
                              </button>
                              <button 
                                onClick={() => onNavigate('board-importer')}
                                className="flex-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase py-2 text-center border border-blue-500/20 rounded-lg hover:bg-blue-500/5 transition-all"
                              >
                                Import
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Recent & Quick */}
        <div className="lg:col-span-4 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Recent Exams</h2>
              <button 
                onClick={() => onNavigate('saved')}
                className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider"
              >
                View All
              </button>
            </div>
            
            <div className="space-y-3">
              {recentExams.length === 0 ? (
                <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl p-8 text-center">
                  <p className="text-zinc-500 text-sm italic">No exams created yet.</p>
                </div>
              ) : (
                recentExams.map((exam) => (
                  <div key={exam.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-900 transition-all flex items-center justify-between group">
                    <div className="min-w-0">
                      <h3 className="font-bold text-white truncate group-hover:text-emerald-400 transition-colors">{exam.examName || 'Untitled Exam'}</h3>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase mt-1">
                        <span className="truncate max-w-[80px]">{exam.className}</span>
                        <span>•</span>
                        <span className="truncate max-w-[80px]">{exam.subject}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onLoadExam(exam)}
                      className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-white hover:text-black transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Quick Tools</h2>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => onNavigate('ai-generator')}
                className="flex items-center gap-4 bg-emerald-600/10 border border-emerald-500/20 p-4 rounded-2xl hover:bg-emerald-600/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40">
                  <Sparkles size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-white">AI Generator</h3>
                  <p className="text-xs text-emerald-400/70">Create MCQs in seconds</p>
                </div>
              </button>

              <button 
                onClick={() => onNavigate('board-importer')}
                className="flex items-center gap-4 bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl hover:bg-blue-600/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-900/40">
                  <Download size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-white">Board Importer</h3>
                  <p className="text-xs text-blue-400/70">Fetch historical questions</p>
                </div>
              </button>

              <button 
                onClick={() => onNavigate('bank')}
                className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center">
                  <Library size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-white">Question Bank</h3>
                  <p className="text-xs text-zinc-500">Manage your collection</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
