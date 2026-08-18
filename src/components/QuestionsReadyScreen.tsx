/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, Check, Download, Share2, Copy, Eye, EyeOff, Sparkles, Star, FileText } from 'lucide-react';
import { GeneratedSet } from '../types';
import { exportToPDF, exportToWord } from '../utils/exportUtils';

interface QuestionsReadyScreenProps {
  generatedSet: GeneratedSet;
  onBack: () => void;
  onSaveToRecent: () => void;
}

export default function QuestionsReadyScreen({
  generatedSet,
  onBack,
  onSaveToRecent
}: QuestionsReadyScreenProps) {
  const [showExplanations, setShowExplanations] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savedToBank, setSavedToBank] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { subject, grade, topic, questionType, quantity, questions, difficulty } = generatedSet;

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case 'EASY': return 'Easy';
      case 'MEDIUM': return 'Medium';
      case 'HARD': return 'Hard';
      default: return diff;
    }
  };

  const handleDownloadPDF = () => {
    setExportingPDF(true);
    setErrorMsg(null);
    setTimeout(() => {
      try {
        exportToPDF(generatedSet);
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal membuat file PDF. Silakan coba lagi.');
      } finally {
        setExportingPDF(false);
      }
    }, 100);
  };

  const handleDownloadWord = async () => {
    setExportingWord(true);
    setErrorMsg(null);
    try {
      await exportToWord(generatedSet);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat file Word. Silakan coba lagi.');
    } finally {
      setExportingWord(false);
    }
  };

  const handleCopyText = () => {
    let textToCopy = `=== ${subject} - Kelas ${grade} ===\n`;
    textToCopy += `Topik: ${topic}\n`;
    textToCopy += `Tipe Soal: ${questionType === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Esai'}\n\n`;

    questions.forEach((q, index) => {
      textToCopy += `${index + 1}. ${q.questionText}\n`;
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
          textToCopy += `   [ ${letter} ] ${opt}\n`;
        });
        textToCopy += `Kunci Jawaban: ${q.correctAnswer}\n`;
      }
      if (q.explanation) {
        textToCopy += `Penjelasan: ${q.explanation}\n`;
      }
      textToCopy += `\n`;
    });

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOptionClick = (questionId: string, optionIndex: number) => {
    const letter = String.fromCharCode(65 + optionIndex); // A, B, C, D
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: letter
    }));
  };

  return (
    <div className="w-full bg-[#FAF6F0] space-y-6 max-w-4xl" id="questions-ready-panel">
      
      {/* Header operations back btn */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="ready-header-bar">
        <button
          onClick={onBack}
          className="px-4 py-2.5 bg-white neo-border-thin rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer hover:bg-gray-50 hover:translate-x-[-1px] transition-all self-start"
          id="ready-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK</span>
        </button>

        {/* Toolbar of supportive actions */}
        <div className="flex flex-wrap gap-2.5" id="ready-toolbar">
          {/* Show / Hide Explanations */}
          <button
            type="button"
            onClick={() => setShowExplanations(!showExplanations)}
            className="px-4 py-2.5 bg-white neo-border-thin rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer hover:bg-gray-50 active:translate-y-0.5"
            id="toggle-keys-btn"
          >
            {showExplanations ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>SEMBUNYIKAN KUNCI</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>TAMPILKAN KUNCI</span>
              </>
            )}
          </button>

          {/* Copy questions */}
          <button
            type="button"
            onClick={handleCopyText}
            className="px-4 py-2.5 bg-white neo-border-thin rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer hover:bg-gray-50 active:translate-y-0.5"
            id="copy-text-btn"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'TERSALIN! 👍' : 'SALIN TEKS'}</span>
          </button>

          {/* Save to recent work */}
          <button
            type="button"
            onClick={() => {
              onSaveToRecent();
              setSavedToBank(true);
              setTimeout(() => setSavedToBank(false), 2000);
            }}
            className="px-4 py-2.5 bg-[#C1F2D0] neo-border-thin rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer hover:bg-[#aee7bf] active:translate-y-0.5"
            id="save-to-bank-btn"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{savedToBank ? 'TERSAMPAN! 🗄️' : 'SIMPAN KE RIWAYAT'}</span>
          </button>
        </div>
      </div>

      {/* Main visual heading of ready state */}
      <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight font-display" id="questions-ready-title">
        YOUR QUESTIONS ARE READY! 🎉
      </h1>

      {/* Metadata Overview Card */}
      <div className="bg-white rounded-2xl neo-border neo-shadow p-6 space-y-4 relative overflow-hidden" id="questions-metadata-box">
        {/* Decorative corner retro star */}
        <div className="absolute right-4 top-4 text-[#FFD166] opacity-30 select-none animate-pulse" id="meta-corner-star">
          <Star className="w-16 h-16 fill-[#FFD166] text-[#1E1E1E]" strokeWidth="1.5" />
        </div>

        <div className="relative z-10 space-y-3" id="meta-flex-group">
          <div className="space-y-1" id="meta-text-block">
            <span className="text-[10px] font-black text-[#FF8B7B] uppercase tracking-widest block" id="meta-eyebrow">
              TOPIK PEMBELAJARAN
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 font-display leading-tight" id="meta-topic-title">
              {topic || 'Umum'}
            </h2>
          </div>

          <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs font-black text-gray-700" id="meta-pill-row">
            <span className="bg-[#B4D3FF] px-2.5 py-1 rounded-md neo-border-thin text-xs text-gray-900 uppercase">
              Kelas {grade}
            </span>
            <span className="bg-white px-2.5 py-1 rounded-md neo-border-thin text-xs text-gray-600">
              {quantity} Soal
            </span>
            <span className="bg-white px-2.5 py-1 rounded-md neo-border-thin text-xs text-gray-600">
              {questionType === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Esai'}
            </span>
            <span className="bg-white px-2.5 py-1 rounded-md neo-border-thin text-xs text-gray-600 capitalize">
              {getDifficultyLabel(difficulty)}
            </span>
          </div>
        </div>
      </div>

      {/* List of generated questions */}
      <div className="space-y-6" id="generated-questions-list">
        {questions.map((q, index) => {
          const isMultipleChoice = q.options && q.options.length > 0;
          return (
            <div key={q.id} className="bg-white rounded-2xl neo-border neo-shadow p-6 space-y-4" id={`q-card-${q.id}`}>
              
              {/* Question label head */}
              <div className="flex items-center justify-between" id={`q-label-row-${q.id}`}>
                <div className="px-3.5 py-1 bg-[#FF8B7B] rounded-full neo-border-thin text-xs font-black text-[#1E1E1E] tracking-wider uppercase" id={`q-label-badge-${q.id}`}>
                  Q{index + 1}
                </div>
                {showExplanations && isMultipleChoice && (
                  <span className="text-[10px] font-black text-[#FF8B7B] uppercase tracking-wider" id={`q-correct-letter-badge-${q.id}`}>
                    Kunci: {q.correctAnswer}
                  </span>
                )}
              </div>

              {/* Question description */}
              <p className="text-gray-900 font-extrabold text-base md:text-lg leading-relaxed font-body" id={`q-text-${q.id}`}>
                {q.questionText}
              </p>

              {/* Choices interactive structure */}
              {isMultipleChoice && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id={`q-choices-grid-${q.id}`}>
                  {q.options.map((option, optIndex) => {
                    const letter = String.fromCharCode(65 + optIndex); // A, B, C, D
                    const isCorrectAnswer = q.correctAnswer === letter;
                    const isUserSelected = selectedAnswers[q.id] === letter;
                    
                    // Style logic matching Image 10.png
                    // Correct key highlights light blue if showExplanations is active, or if user explicitly select it
                    const shouldHighlightCorrect = showExplanations && isCorrectAnswer;
                    
                    return (
                      <button
                        key={optIndex}
                        type="button"
                        onClick={() => handleOptionClick(q.id, optIndex)}
                        className={`p-4 rounded-xl neo-border flex items-center justify-between text-left cursor-pointer transition-all ${
                          shouldHighlightCorrect
                            ? 'bg-[#B4D3FF] text-[#1E1E1E] font-black'
                            : isUserSelected
                            ? 'bg-amber-100 border-[#1E1E1E]'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                        id={`q-${q.id}-choice-${letter}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-black text-sm uppercase px-2 py-0.5 rounded-md bg-gray-100 neo-border-thin text-[#1E1E1E]">
                            {letter}
                          </span>
                          <span className="text-sm font-bold">{option}</span>
                        </div>

                        {/* Checkbox badge like Image 10 */}
                        <div className={`w-5 h-5 rounded-md neo-border-thin bg-white flex items-center justify-center transition-all ${
                          shouldHighlightCorrect ? 'bg-[#1E1E1E] text-white' : ''
                        }`}>
                          {shouldHighlightCorrect && (
                            <Check className="w-3.5 h-3.5 stroke-[4px]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Open text box for essay */}
              {!isMultipleChoice && (
                <div className="p-4 bg-gray-50 neo-border-thin rounded-xl text-xs font-bold text-gray-400 border-dashed" id={`q-essay-open-input-${q.id}`}>
                  [ Lembar Esai Terbuka - Siswa menjawab langsung pada baris ini ]
                </div>
              )}

              {/* Explanations sub-panel */}
              {showExplanations && q.explanation && (
                <div className="p-4 bg-amber-50 rounded-xl neo-border-thin text-xs" id={`q-explanation-box-${q.id}`}>
                  <h5 className="font-extrabold text-[#1E1E1E] mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                    <span>💡</span> Penjelasan Jawaban:
                  </h5>
                  <p className="text-gray-700 font-medium leading-relaxed">
                    {q.explanation}
                  </p>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Decorative prompt below */}
      <div className="p-6 bg-white rounded-2xl neo-border neo-shadow text-center space-y-4" id="ready-bottom-actions">
        <h4 className="text-lg font-black font-display text-gray-900" id="bottom-ready-heading">Ekspor atau Cetak Soal?</h4>
        <p className="text-xs text-gray-500 font-bold max-w-sm mx-auto" id="bottom-ready-desc">
          Anda dapat langsung mencetak soal-soal ini ke kertas ujian atau mengunduhnya dalam format digital untuk siswa.
        </p>
        
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl neo-border-thin max-w-md mx-auto" id="export-error-msg">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3 animate-fade-in" id="bottom-ready-buttons">
          <button
            onClick={handleDownloadPDF}
            disabled={exportingPDF || exportingWord}
            className={`px-5 py-3 bg-[#FFB74D] text-[#1E1E1E] neo-border rounded-xl font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer neo-shadow-sm neo-btn ${
              (exportingPDF || exportingWord) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            id="bottom-pdf-btn"
          >
            <Download className="w-4 h-4" />
            <span>{exportingPDF ? 'MEMPROSES PDF...' : 'UNDUH PDF'}</span>
          </button>

          <button
            onClick={handleDownloadWord}
            disabled={exportingPDF || exportingWord}
            className={`px-5 py-3 bg-[#81C784] text-[#1E1E1E] neo-border rounded-xl font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer neo-shadow-sm neo-btn ${
              (exportingPDF || exportingWord) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            id="bottom-docx-btn"
          >
            <FileText className="w-4 h-4" />
            <span>{exportingWord ? 'MEMPROSES WORD...' : 'UNDUH WORD'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
