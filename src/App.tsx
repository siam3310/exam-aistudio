import React, { useState } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import QuestionBank from './components/QuestionBank';
import { ExamDetails, Question } from './types';
import { FileText, Library, Eye } from 'lucide-react';

// Sample data to start with
const initialBank: Question[] = [
  { id: '1', text: '১. বাংলাদেশের জাতীয় পশুর নাম কি?', options: { a: 'সিংহ', b: 'রয়েল বেঙ্গল টাইগার', c: 'হাতি', d: 'ঘোড়া' }, answer: 'b', subject: 'General Knowledge', difficulty: 'easy' },
  { id: '2', text: '২. কম্পিউটারের মস্তিষ্ক বলা হয় কোনটিকে?', options: { a: 'মনিটর', b: 'কিবোর্ড', c: 'সিপিইউ (CPU)', d: 'মাউস' }, answer: 'c', subject: 'ICT', difficulty: 'easy' },
  { id: '3', text: '৩. বাংলাদেশের জাতীয় স্মৃতিসৌধ কোথায় অবস্থিত?', options: { a: 'ঢাকা', b: 'গাজীপুর', c: 'সাভার', d: 'নারায়ণগঞ্জ' }, answer: 'c', subject: 'General Knowledge', difficulty: 'medium' },
  { id: '4', text: '৪. পৃথিবীর সবচেয়ে বড় মহাসাগর কোনটি?', options: { a: 'আটলান্টিক মহাসাগর', b: 'ভারত মহাসাগর', c: 'আর্কটিক মহাসাগর', d: 'প্রশান্ত মহাসাগর' }, answer: 'd', subject: 'Geography', difficulty: 'medium' },
  { id: '5', text: '৫. বাংলাদেশের জাতীয় সংগীতের রচয়িতা কে?', options: { a: 'কাজী নজরুল ইসলাম', b: 'রবীন্দ্রনাথ ঠাকুর', c: 'জীবনানন্দ দাশ', d: 'জসীমউদ্দীন' }, answer: 'b', subject: 'Literature', difficulty: 'easy' },
  { id: '6', text: '৬. কোনটিকে ‘সূর্যোদয়ের দেশ’ বলা হয়?', options: { a: 'চীন', b: 'জাপান', c: 'ভারত', d: 'থাইল্যান্ড' }, answer: 'b', subject: 'Geography', difficulty: 'medium' },
  { id: '7', text: '৭. বাংলাদেশের প্রধান নদীর নাম কি?', options: { a: 'পদ্মা', b: 'মেঘনা', c: 'যমুনা', d: 'ব্রহ্মপুত্র' }, answer: 'a', subject: 'Geography', difficulty: 'easy' },
  { id: '8', text: '৮. সৌরজগতের বৃহত্তম গ্রহ কোনটি?', options: { a: 'পৃথিবী', b: 'মঙ্গল', c: 'বৃহস্পতি', d: 'শনি' }, answer: 'c', subject: 'Science', difficulty: 'medium' },
  { id: '9', text: '৯. বাংলাদেশের স্বাধীনতা দিবস কবে?', options: { a: '১৬ই ডিসেম্বর', b: '২১শে ফেব্রুয়ারি', c: '২৬শে মার্চ', d: '১৪ই এপ্রিল' }, answer: 'c', subject: 'History', difficulty: 'easy' },
  { id: '10', text: '১০. কোন ভিটামিনের অভাবে রাতকানা রোগ হয়?', options: { a: 'ভিটামিন সি', b: 'ভিটামিন ডি', c: 'ভিটামিন এ', d: 'ভিটামিন বি' }, answer: 'c', subject: 'Science', difficulty: 'hard' },
];

export default function App() {
  const [view, setView] = useState<'bank' | 'editor' | 'preview'>('bank');
  
  const [examDetails, setExamDetails] = useState<ExamDetails>({
    institutionName: 'আপনার প্রতিষ্ঠানের নাম দিন',
    examName: 'বার্ষিক পরীক্ষা - ২০২৪',
    subject: 'সাধারণ জ্ঞান (নমুনা)',
    fullMarks: '৩০',
    date: new Date().toLocaleDateString('bn-BD'),
    time: '৩০ মিনিট',
  });

  const [bank, setBank] = useState<Question[]>(initialBank);
  const [examQuestions, setExamQuestions] = useState<Question[]>(initialBank.slice(0, 5));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between shadow-sm no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold">
            E
          </div>
          <span className="text-xl font-bold tracking-tight">ExamBuilder AI</span>
        </div>
        <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
          <button
            onClick={() => setView('bank')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'bank' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Library size={16} />
            Question Bank
          </button>
          <button
            onClick={() => setView('editor')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'editor' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText size={16} />
            Exam Editor
          </button>
          <button
            onClick={() => setView('preview')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Eye size={16} />
            Preview & Export
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {view === 'bank' && (
          <QuestionBank
            bank={bank}
            setBank={setBank}
            examQuestions={examQuestions}
            setExamQuestions={setExamQuestions}
          />
        )}
        {view === 'editor' && (
          <Editor
            examDetails={examDetails}
            setExamDetails={setExamDetails}
            questions={examQuestions}
            setQuestions={setExamQuestions}
            onPreview={() => setView('preview')}
          />
        )}
        {view === 'preview' && (
          <Preview
            examDetails={examDetails}
            questions={examQuestions}
            onBack={() => setView('editor')}
          />
        )}
      </main>
    </div>
  );
}
