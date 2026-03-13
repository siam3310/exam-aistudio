import React, { useState } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import { ExamDetails, Question } from './types';

// Sample data to start with
const initialQuestions: Question[] = [
  { id: '1', text: '১. বাংলাদেশের জাতীয় পশুর নাম কি?', options: { a: 'সিংহ', b: 'রয়েল বেঙ্গল টাইগার', c: 'হাতি', d: 'ঘোড়া' }, answer: 'b' },
  { id: '2', text: '২. কম্পিউটারের মস্তিষ্ক বলা হয় কোনটিকে?', options: { a: 'মনিটর', b: 'কিবোর্ড', c: 'সিপিইউ (CPU)', d: 'মাউস' }, answer: 'c' },
  { id: '3', text: '৩. বাংলাদেশের জাতীয় স্মৃতিসৌধ কোথায় অবস্থিত?', options: { a: 'ঢাকা', b: 'গাজীপুর', c: 'সাভার', d: 'নারায়ণগঞ্জ' }, answer: 'c' },
  { id: '4', text: '৪. পৃথিবীর সবচেয়ে বড় মহাসাগর কোনটি?', options: { a: 'আটলান্টিক মহাসাগর', b: 'ভারত মহাসাগর', c: 'আর্কটিক মহাসাগর', d: 'প্রশান্ত মহাসাগর' }, answer: 'd' },
  { id: '5', text: '৫. বাংলাদেশের জাতীয় সংগীতের রচয়িতা কে?', options: { a: 'কাজী নজরুল ইসলাম', b: 'রবীন্দ্রনাথ ঠাকুর', c: 'জীবনানন্দ দাশ', d: 'জসীমউদ্দীন' }, answer: 'b' },
  { id: '6', text: '৬. কোনটিকে ‘সূর্যোদয়ের দেশ’ বলা হয়?', options: { a: 'চীন', b: 'জাপান', c: 'ভারত', d: 'থাইল্যান্ড' }, answer: 'b' },
  { id: '7', text: '৭. বাংলাদেশের প্রধান নদীর নাম কি?', options: { a: 'পদ্মা', b: 'মেঘনা', c: 'যমুনা', d: 'ব্রহ্মপুত্র' }, answer: 'a' },
  { id: '8', text: '৮. সৌরজগতের বৃহত্তম গ্রহ কোনটি?', options: { a: 'পৃথিবী', b: 'মঙ্গল', c: 'বৃহস্পতি', d: 'শনি' }, answer: 'c' },
  { id: '9', text: '৯. বাংলাদেশের স্বাধীনতা দিবস কবে?', options: { a: '১৬ই ডিসেম্বর', b: '২১শে ফেব্রুয়ারি', c: '২৬শে মার্চ', d: '১৪ই এপ্রিল' }, answer: 'c' },
  { id: '10', text: '১০. কোন ভিটামিনের অভাবে রাতকানা রোগ হয়?', options: { a: 'ভিটামিন সি', b: 'ভিটামিন ডি', c: 'ভিটামিন এ', d: 'ভিটামিন বি' }, answer: 'c' },
];

export default function App() {
  const [view, setView] = useState<'editor' | 'preview'>('editor');
  
  const [examDetails, setExamDetails] = useState<ExamDetails>({
    institutionName: 'আপনার প্রতিষ্ঠানের নাম দিন',
    examName: 'বার্ষিক পরীক্ষা - ২০২৪',
    subject: 'সাধারণ জ্ঞান (নমুনা)',
    fullMarks: '৩০',
    date: new Date().toLocaleDateString('bn-BD'),
    time: '৩০ মিনিট',
  });

  const [questions, setQuestions] = useState<Question[]>(initialQuestions);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      {view === 'editor' ? (
        <Editor
          examDetails={examDetails}
          setExamDetails={setExamDetails}
          questions={questions}
          setQuestions={setQuestions}
          onPreview={() => setView('preview')}
        />
      ) : (
        <Preview
          examDetails={examDetails}
          questions={questions}
          onBack={() => setView('editor')}
        />
      )}
    </div>
  );
}
