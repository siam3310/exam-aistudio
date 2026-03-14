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
  const [isAdding, setIsAdding] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYears, setSelectedYears] = useState<string[]>(['2023']);
  const [selectedBoards, setSelectedBoards] = useState<string[]>(['Dhaka']);
  const [selectedImportTypes, setSelectedImportTypes] = useState<string[]>(['Board']);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
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

  const toggleBoard = (board: string) => {
    setSelectedBoards(prev => 
      prev.includes(board) 
        ? (prev.length > 1 ? prev.filter(b => b !== board) : prev)
        : [...prev, board]
    );
  };

  const toggleImportType = (type: string) => {
    setSelectedImportTypes(prev => 
      prev.includes(type) 
        ? (prev.length > 1 ? prev.filter(t => t !== type) : prev)
        : [...prev, type]
    );
  };

  const toggleQuestionSelection = (id: string) => {
    const newSelected = new Set(selectedQuestionIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuestionIds(newSelected);
  };

  const handleSelectAllQuestions = () => {
    if (selectedQuestionIds.size === generatedQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(generatedQuestions.map(q => q.id)));
    }
  };

  const handleImport = async () => {
    if (!selectedClass || !selectedSubject || selectedYears.length === 0 || selectedBoards.length === 0 || selectedImportTypes.length === 0) return;
    
    setLoading(true);
    setError(null);
    setGeneratedQuestions([]);
    setSelectedQuestionIds(new Set());

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API_KEY_MISSING');
      }
      const ai = new GoogleGenAI({ apiKey });
      const totalRequested = selectedBoards.length * selectedYears.length * 10; // Aim for 10 per combination
      const targetCount = Math.min(Math.max(totalRequested, 50), 100);

      const prompt = `Act as a Bangladesh Education Board Question Expert and Curriculum Specialist. 
      Generate a comprehensive and exhaustive set of MCQ questions for ${selectedClass} ${selectedSubject}.
      The questions should be sourced from or inspired by ${selectedImportTypes.join(', ')} questions from the following years: ${selectedYears.join(', ')} for the following Boards: ${selectedBoards.join(', ')}.
      
      Requirements:
      1. Language: Bengali (Unicode).
      2. Content: Must be accurate to the Bangladesh National Curriculum (NCTB).
      3. Structure: Each question must have 4 options (a, b, c, d) and 1 correct answer.
      4. Variety: Include questions from ALL chapters and difficulty levels (easy, medium, hard).
      5. Metadata: Identify which specific Board and Year each question is likely from.
      6. Quantity: Generate EXACTLY ${targetCount} unique questions. This is CRITICAL. Do not stop at 20. I need a full set of ${targetCount} questions to cover the selected ${selectedBoards.length} boards and ${selectedYears.length} years.
      
      Format the output as a JSON array of objects.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192, // Increase token limit for large sets
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
                sourceBoard: { type: Type.STRING, description: "The board this question is from" },
                sourceYear: { type: Type.STRING, description: "The year this question is from" },
                sourceType: { type: Type.STRING, description: "Board/Model Test/Test Exam" }
              },
              required: ["text", "options", "answer", "chapter", "difficulty"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || '[]');
      const formattedQuestions: Question[] = data.map((q: any) => {
        const id = crypto.randomUUID();
        return {
          id,
          text: q.text,
          options: q.options,
          answer: q.answer,
          className: selectedClass,
          subject: selectedSubject,
          chapter: q.chapter || 'General',
          difficulty: q.difficulty || 'medium',
          source: `${q.sourceBoard || selectedBoards[0]} ${q.sourceType || selectedImportTypes[0]} ${q.sourceYear || selectedYears[0]}`,
          authorUid: userUid,
        };
      });

      setGeneratedQuestions(formattedQuestions);
      setSelectedQuestionIds(new Set(formattedQuestions.map(q => q.id)));
    } catch (err: any) {
      console.error(err);
      if (err.message === 'API_KEY_MISSING') {
        setError("Gemini API key is missing. Please add it to your environment variables.");
      } else if (err.message?.includes('API_KEY_INVALID')) {
        setError("Invalid API Key. Please check your Gemini API key.");
      } else {
        setError("Failed to fetch questions. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddSelected = async () => {
    const questionsToAdd = generatedQuestions.filter(q => selectedQuestionIds.has(q.id));
    if (questionsToAdd.length === 0) return;
    
    setIsAdding(true);
    try {
      await onAddQuestions(questionsToAdd);
      onClose();
    } catch (err) {
      setError("Failed to add questions to bank. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full overflow-hidden shadow-2xl">
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
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-800">
            <X size={20} />
            <span className="text-sm font-medium">Back to Bank</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
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
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Import Types (Multiple)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Board', 'Model Test', 'Test Exam'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => toggleImportType(type)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                        selectedImportTypes.includes(type) 
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Boards (Multiple)</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedBoards(boards)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase"
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setSelectedBoards(['Dhaka'])}
                      className="text-[10px] text-zinc-500 hover:text-zinc-400 font-bold uppercase"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-3 max-h-[150px] overflow-y-auto custom-scrollbar">
                  {boards.map(b => (
                    <button
                      key={b}
                      onClick={() => toggleBoard(b)}
                      className={`px-2 py-2 rounded-lg text-[10px] font-medium transition-all border ${
                        selectedBoards.includes(b)
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
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
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Preview Generated Questions ({generatedQuestions.length})</h3>
                  <button 
                    onClick={handleSelectAllQuestions}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase"
                  >
                    {selectedQuestionIds.size === generatedQuestions.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <button 
                  onClick={handleAddSelected}
                  disabled={isAdding || selectedQuestionIds.size === 0}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {isAdding ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Adding {selectedQuestionIds.size}...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Add Selected ({selectedQuestionIds.size}) to Bank
                    </>
                  )}
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {generatedQuestions.map((q, idx) => (
                  <div 
                    key={q.id} 
                    onClick={() => toggleQuestionSelection(q.id)}
                    className={`p-4 border rounded-xl space-y-2 relative group cursor-pointer transition-all ${
                      selectedQuestionIds.has(q.id) 
                        ? 'bg-emerald-500/5 border-emerald-500/30' 
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="absolute top-4 left-4">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        selectedQuestionIds.has(q.id) 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'bg-zinc-900 border-zinc-700'
                      }`}>
                        {selectedQuestionIds.has(q.id) && <CheckCircle2 size={10} />}
                      </div>
                    </div>
                    <div className="pl-8">
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-sm text-white font-medium">{idx + 1}. {q.text}</p>
                        {q.source && (
                          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase whitespace-nowrap">
                            {q.source}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 mt-2">
                        <span>(a) {q.options.a}</span>
                        <span>(b) {q.options.b}</span>
                        <span>(c) {q.options.c}</span>
                        <span>(d) {q.options.d}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={loading || !selectedClass || !selectedSubject || selectedYears.length === 0 || selectedBoards.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-4 rounded-xl transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-900/20"
          >
            <div className="flex items-center gap-2">
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Sparkles size={20} />
              )}
              <span>{loading ? 'Fetching Questions...' : 'Fetch Board Questions'}</span>
            </div>
            {!loading && (
              <span className="text-[10px] opacity-60 font-medium uppercase tracking-widest">
                Targeting ~{Math.min(Math.max(selectedBoards.length * selectedYears.length * 10, 50), 100)} Questions
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
