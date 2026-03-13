import React, { useState, useEffect } from 'react';
import { Exam } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { FileText, Trash2, Edit, Calendar, Clock, BookOpen } from 'lucide-react';

interface SavedExamsProps {
  userUid: string;
  onLoadExam: (exam: Exam) => void;
}

export default function SavedExams({ userUid, onLoadExam }: SavedExamsProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const examsPath = `users/${userUid}/exams`;
    const q = query(collection(db, examsPath), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const examsData: Exam[] = [];
      snapshot.forEach((doc) => {
        examsData.push({ id: doc.id, ...doc.data() } as Exam);
      });
      setExams(examsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching exams:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userUid]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, `users/${userUid}/exams/${id}`));
    } catch (error) {
      console.error("Error deleting exam:", error);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-zinc-400">Loading saved exams...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Saved Exams</h1>
        <p className="text-zinc-400 mt-1">Manage and load your previously created question papers</p>
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          No saved exams found. Create and save an exam from the Editor.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col hover:border-zinc-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white line-clamp-2">{exam.examName || 'Untitled Exam'}</h3>
                <button
                  onClick={() => handleDelete(exam.id)}
                  className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                  title="Delete Exam"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="space-y-2 mb-6 flex-1">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <BookOpen size={14} />
                  <span>{exam.className} • {exam.subject}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <FileText size={14} />
                  <span>{exam.examQuestions?.length || 0} Questions • {exam.fullMarks} Marks</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Calendar size={14} />
                  <span>{exam.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Clock size={14} />
                  <span>{exam.time}</span>
                </div>
              </div>
              
              <button
                onClick={() => onLoadExam(exam)}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-700 transition-colors"
              >
                <Edit size={16} />
                Load Exam
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
