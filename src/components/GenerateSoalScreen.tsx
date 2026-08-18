/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, Sparkles } from 'lucide-react';
import { Difficulty, QuestionType } from '../types';
import { SUBJECTS, GRADES } from '../data';

interface GenerateSoalScreenProps {
  onBackToDashboard: () => void;
  onStartGenerating: (params: {
    subject: string;
    grade: string;
    topic: string;
    difficulty: Difficulty;
    questionType: QuestionType;
    quantity: number;
  }) => void;
}

export default function GenerateSoalScreen({
  onBackToDashboard,
  onStartGenerating
}: GenerateSoalScreenProps) {
  const [selectedSubject, setSelectedSubject] = useState('Matematika');
  const [selectedGrade, setSelectedGrade] = useState('X');
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.MULTIPLE_CHOICE);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [quantity, setQuantity] = useState<number>(15);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSubjects = SUBJECTS.filter((subject) =>
    subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartGenerating({
      subject: selectedSubject,
      grade: selectedGrade,
      topic,
      difficulty,
      questionType,
      quantity
    });
  };

  return (
    <div className="w-full bg-[#FAF6F0]" id="generate-soal-panel">
      {/* Header operations bar */}
      <div className="flex items-center gap-4 mb-6" id="generate-soal-header">
        <button
          onClick={onBackToDashboard}
          className="px-4 py-2.5 bg-white neo-border-thin rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer hover:bg-gray-50 hover:translate-x-[-1px] transition-all"
          id="back-to-dashboard-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK</span>
        </button>
      </div>

      {/* Main Title & bubble statement */}
      <div className="mb-6 space-y-3" id="generate-title-block">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight font-display flex items-center gap-2" id="generate-soal-h1">
          LET'S MAKE SOME QUESTIONS! <Sparkles className="w-6 h-6 text-[#FF8B7B]" />
        </h1>
        <div className="inline-block px-4 py-2 bg-white neo-border-thin rounded-xl text-xs font-extrabold text-gray-800" id="generate-instruction-bubble">
          Tell us what you want to teach.
        </div>
      </div>

      {/* Form container */}
      <form onSubmit={handleFormSubmit} className="bg-[#FAF6F0] rounded-2xl neo-border neo-shadow-lg p-6 lg:p-8 space-y-6 max-w-4xl" id="generate-form">
        
        {/* Mata Pelajaran Dropdown */}
        <div className="space-y-2 relative" id="subject-field">
          <label className="block text-sm font-black text-gray-900 uppercase tracking-wide" htmlFor="subject-select">
            Mata Pelajaran
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                if (!isDropdownOpen) {
                  setSearchQuery('');
                }
              }}
              className="w-full px-4 py-4 bg-white neo-border rounded-xl font-bold text-sm text-left text-gray-900 flex justify-between items-center cursor-pointer hover:bg-gray-50 focus:outline-none"
              id="subject-dropdown-trigger"
            >
              <span>{selectedSubject || 'Pilih mata pelajaran...'}</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div 
                className="absolute top-[105%] left-0 w-full bg-white neo-border rounded-xl z-30 shadow-lg max-h-80 flex flex-col overflow-hidden" 
                id="subject-dropdown-list"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Search input for filterability */}
                <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2" id="subject-search-container">
                  <input
                    type="text"
                    placeholder="Cari mata pelajaran..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#FF8B7B] focus:border-[#FF8B7B]"
                    id="subject-search-input"
                    autoFocus
                  />
                </div>
                {/* Filtered items list */}
                <div className="overflow-y-auto max-h-56 flex-1" id="subject-scrollable-area">
                  {filteredSubjects.length > 0 ? (
                    filteredSubjects.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => {
                          setSelectedSubject(subject);
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-[#FF8B7B]/20 transition-all ${
                          selectedSubject === subject ? 'bg-[#FF8B7B]/10 font-black' : ''
                        }`}
                      >
                        {subject}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-xs font-black text-gray-400 text-center uppercase tracking-wide">
                      Mata Pelajaran Tidak Ditemukan
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kelas Horizontal Pills */}
        <div className="space-y-2" id="grade-field">
          <label className="block text-sm font-black text-gray-900 uppercase tracking-wide">
            Kelas
          </label>
          <div className="flex gap-4" id="grade-pills-row">
            {GRADES.map((grade) => {
              const isActive = selectedGrade === grade;
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGrade(grade)}
                  className={`w-12 h-12 rounded-full neo-border font-black text-sm transition-all duration-100 flex items-center justify-center cursor-pointer ${
                    isActive
                      ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-shadow-sm scale-105'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  id={`grade-pill-${grade}`}
                >
                  {grade}
                </button>
              );
            })}
          </div>
        </div>

        {/* Topik / Materi Spesifik */}
        <div className="space-y-2" id="topic-field">
          <div className="flex justify-between items-baseline" id="topic-label-row">
            <label className="block text-sm font-black text-gray-900 uppercase tracking-wide" htmlFor="topic-input">
              Topik / Materi Spesifik
            </label>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wide" id="topic-helper-label">
              Optional AI Prompt
            </span>
          </div>
          <textarea
            id="topic-input"
            rows={4}
            className="w-full px-4 py-4 bg-white neo-border rounded-xl font-medium text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-[#FF8B7B]"
            placeholder="Contoh: Persamaan linear dua variabel, fokus pada soal cerita kehidupan sehari-hari..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        {/* Row for Type Soal and Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="form-grid-fields">
          
          {/* Tipe Soal Radio selector */}
          <div className="space-y-2" id="type-field">
            <label className="block text-sm font-black text-gray-900 uppercase tracking-wide">
              Tipe Soal
            </label>
            <div className="space-y-3" id="type-options">
              
              {/* Option 1: Pilihan Ganda */}
              <button
                type="button"
                onClick={() => setQuestionType(QuestionType.MULTIPLE_CHOICE)}
                className={`w-full p-4 rounded-xl neo-border flex items-center justify-between cursor-pointer transition-all ${
                  questionType === QuestionType.MULTIPLE_CHOICE
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                id="type-opt-mc"
              >
                <span className="font-extrabold text-sm">Pilihan Ganda</span>
                <div className="w-5 h-5 rounded-full neo-border-thin bg-white flex items-center justify-center">
                  {questionType === QuestionType.MULTIPLE_CHOICE && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1E1E1E]" />
                  )}
                </div>
              </button>

              {/* Option 2: Essay */}
              <button
                type="button"
                onClick={() => setQuestionType(QuestionType.ESSAY)}
                className={`w-full p-4 rounded-xl neo-border flex items-center justify-between cursor-pointer transition-all ${
                  questionType === QuestionType.ESSAY
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                id="type-opt-essay"
              >
                <span className="font-extrabold text-sm">Essay</span>
                <div className="w-5 h-5 rounded-full neo-border-thin bg-white flex items-center justify-center">
                  {questionType === QuestionType.ESSAY && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1E1E1E]" />
                  )}
                </div>
              </button>

            </div>
          </div>

          {/* Tingkat Kesulitan */}
          <div className="space-y-2" id="difficulty-field">
            <label className="block text-sm font-black text-gray-900 uppercase tracking-wide">
              Tingkat Kesulitan
            </label>
            <div className="space-y-3" id="difficulty-options">
              
              {/* Easy */}
              <button
                type="button"
                onClick={() => setDifficulty(Difficulty.EASY)}
                className={`w-full p-4 rounded-xl neo-border flex items-center justify-between cursor-pointer transition-all ${
                  difficulty === Difficulty.EASY
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                id="difficulty-opt-easy"
              >
                <span className="font-extrabold text-sm">Easy</span>
                {/* Visual dots green */}
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 neo-border-thin" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200 neo-border-thin" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200 neo-border-thin" />
                </div>
              </button>

              {/* Medium */}
              <button
                type="button"
                onClick={() => setDifficulty(Difficulty.MEDIUM)}
                className={`w-full p-4 rounded-xl neo-border flex items-center justify-between cursor-pointer transition-all ${
                  difficulty === Difficulty.MEDIUM
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                id="difficulty-opt-medium"
              >
                <span className="font-extrabold text-sm">Medium</span>
                {/* Visual dots orange */}
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 neo-border-thin" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 neo-border-thin" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200 neo-border-thin" />
                </div>
              </button>

              {/* Hard */}
              <button
                type="button"
                onClick={() => setDifficulty(Difficulty.HARD)}
                className={`w-full p-4 rounded-xl neo-border flex items-center justify-between cursor-pointer transition-all ${
                  difficulty === Difficulty.HARD
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                id="difficulty-opt-hard"
              >
                <span className="font-extrabold text-sm">Hard</span>
                {/* Visual dots red */}
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 neo-border-thin" />
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 neo-border-thin" />
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 neo-border-thin" />
                </div>
              </button>

            </div>
          </div>
        </div>

        {/* Jumlah Soal selector */}
        <div className="space-y-2" id="quantity-field">
          <label className="block text-sm font-black text-gray-900 uppercase tracking-wide">
            Jumlah Soal
          </label>
          <div className="flex flex-wrap gap-3" id="quantity-capsules-row">
            {[10, 15, 20, 25, 30].map((qty) => {
              const isActive = quantity === qty;
              return (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setQuantity(qty)}
                  className={`px-5 py-2.5 rounded-full neo-border font-black text-xs transition-all duration-100 cursor-pointer ${
                    isActive
                      ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-shadow-sm scale-105'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  id={`qty-capsule-${qty}`}
                >
                  {qty}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate Button submit */}
        <button
          type="submit"
          className="w-full py-4.5 bg-[#FF8B7B] text-[#1E1E1E] neo-border rounded-xl font-black text-lg tracking-wider flex items-center justify-center gap-2 cursor-pointer neo-shadow neo-btn mt-8 hover:bg-[#ff9f8f]"
          id="generate-form-submit-btn"
        >
          <Sparkles className="w-5 h-5" />
          <span>GENERATE SOAL!</span>
        </button>

      </form>
    </div>
  );
}
