import React, { useRef, useState } from 'react';
import { ExamDetails, Question } from '../types';
import { ArrowLeft, Printer, Download, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PreviewProps {
  examDetails: ExamDetails;
  questions: Question[];
  onBack: () => void;
}

export default function Preview({ examDetails, questions, onBack }: PreviewProps) {
  const [view, setView] = useState<'questions' | 'answers'>('questions');
  const paperRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!paperRef.current) return;
    const element = paperRef.current;
    const originalStyle = element.style.cssText;
    
    try {
      // Temporarily adjust styles to ensure full capture
      element.style.height = 'auto';
      element.style.overflow = 'visible';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${examDetails.examName || 'Question_Paper'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      element.style.cssText = originalStyle;
    }
  };

  const handleExportPNG = async () => {
    if (!paperRef.current) return;
    const element = paperRef.current;
    const originalStyle = element.style.cssText;
    
    try {
      element.style.height = 'auto';
      element.style.overflow = 'visible';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
      });
      
      const link = document.createElement('a');
      link.download = `${examDetails.examName || 'Question_Paper'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating PNG:', error);
    } finally {
      element.style.cssText = originalStyle;
    }
  };

  const midPoint = Math.ceil(questions.length / 2);
  const col1 = questions.slice(0, midPoint);
  const col2 = questions.slice(midPoint);

  const optionLabels = { a: 'ক', b: 'খ', c: 'গ', d: 'ঘ' };

  return (
    <div className="min-h-screen bg-zinc-950 pb-12">
      {/* Toolbar (No Print) */}
      <div className="no-print sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Editor
          </button>
          <div className="h-6 w-px bg-zinc-800 mx-2"></div>
          <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
            <button
              onClick={() => setView('questions')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'questions' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Question Paper
            </button>
            <button
              onClick={() => setView('answers')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'answers' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Answer Sheet
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            <Download size={16} />
            PDF
          </button>
          <button
            onClick={handleExportPNG}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            <ImageIcon size={16} />
            PNG
          </button>
        </div>
      </div>

      {/* Paper Container */}
      <div className="mt-8 flex justify-center px-4">
        <div
          ref={paperRef}
          className="paper-container bg-white text-black w-full max-w-[8.5in] min-h-[11in] p-[1in] shadow-xl rounded-sm"
          style={{ fontFamily: "'Hind Siliguri', sans-serif" }}
        >
          {view === 'questions' ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-1">{examDetails.institutionName || '[Institution Name]'}</h2>
                <p className="text-xl mb-1">{examDetails.examName || '[Exam Name]'}</p>
                <p className="text-xl mb-4">বিষয়: {examDetails.subject || '[Subject]'}</p>
                
                <div className="flex justify-between items-center text-lg font-semibold border-y border-gray-300 py-3 mt-4">
                  <span>পূর্ণমান: {examDetails.fullMarks || questions.length}</span>
                  <span>তারিখ: {examDetails.date || new Date().toLocaleDateString('bn-BD')}</span>
                  <span>সময়: {examDetails.time || '৩০ মিনিট'}</span>
                </div>
              </div>

              {/* Questions Grid */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                {/* Column 1 */}
                <div className="space-y-6">
                  {col1.map((q, i) => (
                    <div key={q.id} className="break-inside-avoid">
                      <p className="font-medium text-[1.1rem] mb-2 leading-snug">
                        {q.text || `প্রশ্ন ${i + 1}`}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-6 text-[1rem]">
                        <span>(ক) {q.options.a}</span>
                        <span>(খ) {q.options.b}</span>
                        <span>(গ) {q.options.c}</span>
                        <span>(ঘ) {q.options.d}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Column 2 */}
                <div className="space-y-6">
                  {col2.map((q, i) => (
                    <div key={q.id} className="break-inside-avoid">
                      <p className="font-medium text-[1.1rem] mb-2 leading-snug">
                        {q.text || `প্রশ্ন ${midPoint + i + 1}`}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-6 text-[1rem]">
                        <span>(ক) {q.options.a}</span>
                        <span>(খ) {q.options.b}</span>
                        <span>(গ) {q.options.c}</span>
                        <span>(ঘ) {q.options.d}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Answer Sheet Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-1">উত্তরমালা</h2>
                <p className="text-xl mb-1">{examDetails.examName || '[Exam Name]'}</p>
                <p className="text-xl mb-4">বিষয়: {examDetails.subject || '[Subject]'}</p>
                <div className="border-b border-gray-300 pb-4"></div>
              </div>

              {/* Answers Grid */}
              <div className="columns-2 gap-12">
                {questions.map((q, i) => (
                  <div key={q.id} className="break-inside-avoid mb-3 text-[1.1rem]">
                    <span className="font-bold mr-2">{i + 1}. ({optionLabels[q.answer]})</span>
                    <span>{q.options[q.answer]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
