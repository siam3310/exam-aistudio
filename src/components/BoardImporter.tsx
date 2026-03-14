import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Taxonomy } from '../types';
import { X, Sparkles, Loader2, Download, CheckCircle2, AlertCircle } from 'lucide-react';

interface BoardImporterProps {
  taxonomy: Taxonomy;
  userUid: string;
  onAddQuestions: (questions: Question[]) => void;
  onClose: () => void;
}

export default function BoardImporter({ taxonomy, userUid, onAddQuestions, onClose }: BoardImporterProps) {
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYears, setSelectedYears] = useState<string[]>(['2023']);
  const [selectedBoard, setSelectedBoard] = useState('Dhaka');
  const [importType, setImportType] = useState<'Board' | 'Model Test' | 'Test Exam'>('Board');
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  const years = Array.from({ length: 15 }, (_, i) => (2024 - i).toString());
  const boards = ['Dhaka', 'Comilla', 'Rajshahi', 'Jessore', 'Chittagong', 'Barisal', 'Sylhet', 'Dinajpur', 'Mymensingh', 'Madrasah', 'Technical'];

  const toggleYear = (year: string) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year) 
        : [...prev, year].sort((a, b) => parseInt(b) - parseInt(a))
    );
  };

  const handleImport = async () => {
    if (!selectedClass || !selectedSubject || selectedYears.length === 0) return;
    
    setLoading(true);
    setError(null);
    setGeneratedQuestions([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `Act as a Bangladesh Education Board Question Expert and Curriculum Specialist. 
      Generate a comprehensive set of MCQ questions (at least 15-20) for ${selectedClass} ${selectedSubject}.
      The questions should be sourced from or inspired by ${importType} questions from the following years: ${selectedYears.join(', ')} for the ${selectedBoard} Board.
      
      Requirements:
      1. Language: Bengali (Unicode).
      2. Content: Must be accurate to the Bangladesh National Curriculum (NCTB).
      3. Structure: Each question must have 4 options (a, b, c, d) and 1 correct answer.
      4. Variety: Include questions from different chapters and difficulty levels (easy, medium, hard).
      5. Metadata: Identify which year/source each question is likely from if possible.
      
      Format the output as a JSON array of objects.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The question text in Bengali" },
                options: {
                  type: Type.OBJECT,
                  properties: {
                    a: { type: Type.STRING },
                    b: { type: Type.STRING },
                    c: { type: Type.STRING },
                    d: { type: Type.STRING },
                  },
                  required: ["a", "b", "c", "d"]
                },
                answer: { type: Type.STRING, enum: ["a", "b", "c", "d"] },
                chapter: { type: Type.STRING, description: "Relevant chapter name in Bengali" },
                difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
                sourceYear: { type: Type.STRING, description: "The year this question is from" }
              },
              required: ["text", "options", "answer", "chapter", "difficulty"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || '[]');
      const formattedQuestions: Question[] = data.map((q: any) => ({
        id: crypto.randomUUID(),
        text: q.text,
        options: q.options,
        answer: q.answer,
        className: selectedClass,
        subject: selectedSubject,
        chapter: q.chapter || 'General',
        difficulty: q.difficulty || 'medium',
        authorUid: userUid,
        metadata: {
          source: `${selectedBoard} ${importType} ${q.sourceYear || selectedYears[0]}`,
          isHistorical: true
        }
      }));

      setGeneratedQuestions(formattedQuestions);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('API_KEY_INVALID')) {
        setError("Invalid API Key. Please check your Gemini API key in settings.");
      } else {
        setError("Failed to fetch questions. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAll = () => {
    onAddQuestions(generatedQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Board Question Importer</h2>
              <p className="text-sm text-zinc-400">Import historical MCQ questions from Bangladesh Boards</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                >
                  <option value="">Select Class</option>
                  {taxonomy.classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={!selectedClass}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none disabled:opacity-50"
                >
                  <option value="">Select Subject</option>
                  {(selectedClass ? taxonomy.subjects[selectedClass] || [] : []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Import Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Board', 'Model Test', 'Test Exam'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setImportType(type)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                        importType === type 
                          ? 'bg-emerald-600 border-emerald-500 text-white' 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Board</label>
                <select
                  value={selectedBoard}
                  onChange={(e) => setSelectedBoard(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                >
                  {boards.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Select Years (Multiple)</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedYears(years)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase"
                  >
                    Select All
                  </button>
                  <button 
                    onClick={() => setSelectedYears([])}
                    className="text-[10px] text-zinc-500 hover:text-zinc-400 font-bold uppercase"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-3 max-h-[280px] overflow-y-auto custom-scrollbar">
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => toggleYear(y)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all border ${
                      selectedYears.includes(y)
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 italic">Click to select/deselect multiple years</p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {generatedQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Preview Generated Questions ({generatedQuestions.length})</h3>
                <button 
                  onClick={handleAddAll}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 size={14} />
                  Add All to Bank
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {generatedQuestions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <p className="text-sm text-white font-medium">{idx + 1}. {q.text}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                      <span>(a) {q.options.a}</span>
                      <span>(b) {q.options.b}</span>
                      <span>(c) {q.options.c}</span>
                      <span>(d) {q.options.d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={loading || !selectedClass || !selectedSubject}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Fetching Board Questions...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Fetch Historical Questions
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
