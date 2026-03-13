import React, { useState } from 'react';
import { Taxonomy, Question } from '../types';
import { Sparkles, Loader2, CheckCircle2, Circle, Plus, X } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

interface AIGeneratorProps {
  taxonomy: Taxonomy;
  userUid: string;
  onAddQuestions: (questions: Question[]) => void;
  onClose: () => void;
}

export default function AIGenerator({ taxonomy, userUid, onAddQuestions, onClose }: AIGeneratorProps) {
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState<'Bengali' | 'English'>('Bengali');
  const [topic, setTopic] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Partial<Question>[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!className || !subject || !chapter) {
      setError('Please select Class, Subject, and Chapter.');
      return;
    }
    setError('');
    setIsGenerating(true);
    setGeneratedQuestions([]);
    setSelectedIndices(new Set());

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Generate ${count} multiple-choice questions for Class ${className}, Subject ${subject}, Chapter ${chapter}. 
      ${topic ? `Focus specifically on the topic: ${topic}.` : ''}
      The difficulty level should be ${difficulty}.
      The language of the questions and options MUST be in ${language}.
      Return the response in JSON format.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The question text" },
                options: {
                  type: Type.OBJECT,
                  properties: {
                    a: { type: Type.STRING },
                    b: { type: Type.STRING },
                    c: { type: Type.STRING },
                    d: { type: Type.STRING }
                  },
                  required: ["a", "b", "c", "d"]
                },
                answer: { type: Type.STRING, description: "The correct option key: 'a', 'b', 'c', or 'd'" }
              },
              required: ["text", "options", "answer"]
            }
          }
        }
      });

      const jsonStr = response.text?.trim() || '[]';
      const parsed = JSON.parse(jsonStr);
      
      if (Array.isArray(parsed)) {
        const formatted = parsed.map(q => ({
          ...q,
          className,
          subject,
          chapter,
          difficulty,
          authorUid: userUid
        }));
        setGeneratedQuestions(formatted);
        // Select all by default
        setSelectedIndices(new Set(formatted.map((_, i) => i)));
      } else {
        setError('Failed to generate valid questions. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleSaveSelected = () => {
    const questionsToAdd = generatedQuestions
      .filter((_, i) => selectedIndices.has(i))
      .map(q => ({
        ...q,
        id: crypto.randomUUID(),
      })) as Question[];
      
    if (questionsToAdd.length > 0) {
      onAddQuestions(questionsToAdd);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Question Generator</h2>
              <p className="text-sm text-zinc-400">Instantly create high-quality MCQs for your classes</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2 bg-zinc-800/50 rounded-lg hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {generatedQuestions.length === 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Class</label>
                  <select
                    value={className}
                    onChange={(e) => { setClassName(e.target.value); setSubject(''); setChapter(''); }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none"
                  >
                    <option value="">Select Class</option>
                    {taxonomy.classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => { setSubject(e.target.value); setChapter(''); }}
                    disabled={!className}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none disabled:opacity-50"
                  >
                    <option value="">Select Subject</option>
                    {(className ? taxonomy.subjects[className] || [] : []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Chapter</label>
                  <select
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    disabled={!subject}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none disabled:opacity-50"
                  >
                    <option value="">Select Chapter</option>
                    {(className && subject ? taxonomy.chapters[`${className}_${subject}`] || [] : []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Number of Questions</label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none"
                  >
                    <option value="Bengali">Bengali</option>
                    <option value="English">English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Specific Topic (Optional)</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Photosynthesis, Newton's Laws, etc."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !className || !subject || !chapter}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate {count} Questions
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-white">Review Generated Questions</h3>
                <span className="text-sm text-zinc-400">{selectedIndices.size} of {generatedQuestions.length} selected</span>
              </div>
              
              <div className="space-y-3">
                {generatedQuestions.map((q, i) => {
                  const isSelected = selectedIndices.has(i);
                  return (
                    <div key={i} className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-zinc-800/50 border-emerald-500/30' : 'bg-zinc-950 border-zinc-800 opacity-60'}`}>
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleSelection(i)}
                          className="mt-1 flex-shrink-0 text-zinc-400 hover:text-white transition-colors"
                        >
                          {isSelected ? <CheckCircle2 className="text-emerald-500" size={24} /> : <Circle size={24} />}
                        </button>
                        <div className="flex-1">
                          <p className="font-medium text-white text-lg mb-3">{q.text}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-zinc-400">
                            <span className={q.answer === 'a' ? 'text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded' : 'px-2 py-1'}>(a) {q.options?.a}</span>
                            <span className={q.answer === 'b' ? 'text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded' : 'px-2 py-1'}>(b) {q.options?.b}</span>
                            <span className={q.answer === 'c' ? 'text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded' : 'px-2 py-1'}>(c) {q.options?.c}</span>
                            <span className={q.answer === 'd' ? 'text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded' : 'px-2 py-1'}>(d) {q.options?.d}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {generatedQuestions.length > 0 && (
          <div className="p-6 border-t border-zinc-800 flex justify-between items-center bg-zinc-900/50 rounded-b-2xl">
            <button
              onClick={() => { setGeneratedQuestions([]); setSelectedIndices(new Set()); }}
              className="text-zinc-400 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Discard & Try Again
            </button>
            <button
              onClick={handleSaveSelected}
              disabled={selectedIndices.size === 0}
              className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl font-medium hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} />
              Add {selectedIndices.size} Questions to Bank
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
