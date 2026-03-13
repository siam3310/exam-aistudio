import React, { useState, useEffect } from 'react';
import { Exam, Question, Taxonomy } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { BookOpen, FileText, Library, Users, Sparkles, ArrowRight } from 'lucide-react';

interface DashboardProps {
  userUid: string;
  userName: string;
  bank: Question[];
  taxonomy: Taxonomy;
  onNavigate: (view: 'bank' | 'editor' | 'preview' | 'saved') => void;
  onLoadExam: (exam: Exam) => void;
}

export default function Dashboard({ userUid, userName, bank, taxonomy, onNavigate, onLoadExam }: DashboardProps) {
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [totalExams, setTotalExams] = useState(0);

  useEffect(() => {
    const examsPath = `users/${userUid}/exams`;
    const q = query(collection(db, examsPath), orderBy('createdAt', 'desc'), limit(3));
    
    // We also need total exams count, but for simplicity we'll just use the recent ones if it's small,
    // or we can do a separate query. Let's just do a general query for count.
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

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back, {userName}!</h1>
        <p className="text-zinc-400 mt-1">Manage your institution's question papers and classes from your dashboard.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Total Questions</h3>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Library size={18} />
            </div>
          </div>
          <span className="text-3xl font-bold text-white">{bank.length}</span>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Saved Exams</h3>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileText size={18} />
            </div>
          </div>
          <span className="text-3xl font-bold text-white">{totalExams}</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Classes Managed</h3>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <span className="text-3xl font-bold text-white">{totalClasses}</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Subjects</h3>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <BookOpen size={18} />
            </div>
          </div>
          <span className="text-3xl font-bold text-white">{totalSubjects}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          
          <button 
            onClick={() => onNavigate('editor')}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white text-black flex items-center justify-center">
                <Plus size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-white group-hover:text-zinc-200">Create New Exam</h3>
                <p className="text-xs text-zinc-500">Start a blank question paper</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-zinc-600 group-hover:text-white transition-colors" />
          </button>

          <button 
            onClick={() => onNavigate('bank')}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-white group-hover:text-zinc-200">Generate Questions</h3>
                <p className="text-xs text-zinc-500">Use AI to build your bank</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-zinc-600 group-hover:text-white transition-colors" />
          </button>

          <button 
            onClick={() => onNavigate('saved')}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
                <Library size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-white group-hover:text-zinc-200">Browse Library</h3>
                <p className="text-xs text-zinc-500">View all saved exams</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-zinc-600 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Recent Exams */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Exams</h2>
            <button 
              onClick={() => onNavigate('saved')}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              View All
            </button>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {recentExams.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                No exams created yet. Click "Create New Exam" to get started.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {recentExams.map((exam) => (
                  <div key={exam.id} className="p-4 hover:bg-zinc-800/50 transition-colors flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">{exam.examName || 'Untitled Exam'}</h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                        <span>{exam.className}</span>
                        <span>•</span>
                        <span>{exam.subject}</span>
                        <span>•</span>
                        <span>{exam.date}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onLoadExam(exam)}
                      className="px-3 py-1.5 bg-zinc-800 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
