/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface AiCookingModalProps {
  isOpen: boolean;
  onFinish: () => void;
}

export default function AiCookingModal({ isOpen, onFinish }: AiCookingModalProps) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(1); // 1 = Analyzing Kurikulum, 2 = Generating Soal

  useEffect(() => {
    if (!isOpen) return;

    setProgress(0);
    setStep(1);

    // Increment progress bar sequentially
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onFinish();
          }, 400);
          return 100;
        }

        const increment = Math.floor(Math.random() * 8) + 5;
        const nextProgress = Math.min(prev + increment, 100);

        if (nextProgress > 50) {
          setStep(2);
        }

        return nextProgress;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isOpen, onFinish]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#B4D3FF]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="cooking-modal-overlay">
      <div className="bg-[#FAF6F0] w-full max-w-xl rounded-3xl neo-border neo-shadow-xl p-6 md:p-10 text-center relative" id="cooking-modal-card">
        
        {/* Floating Accent settings sprocket */}
        <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#FF8B7B] rounded-full neo-border flex items-center justify-center animate-spin-slow shadow-sm" id="cooking-cog-accent">
          <span className="text-xl">⚙️</span>
        </div>

        {/* Circular Animation Frame */}
        <div className="mx-auto w-40 h-40 md:w-48 md:h-48 rounded-full bg-white neo-border flex items-center justify-center overflow-hidden mb-6 relative shadow-inner" id="cooking-illustration-frame">
          <svg className="w-32 h-32" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Stove panel */}
            <rect x="25" y="80" width="70" height="25" rx="4" fill="#B4D3FF" stroke="#1E1E1E" strokeWidth="2.5" />
            <circle cx="45" cy="92" r="3" fill="#1E1E1E" />
            <circle cx="60" cy="92" r="3" fill="#1E1E1E" />
            <circle cx="75" cy="92" r="3" fill="#1E1E1E" />

            {/* Boiling cooking pot */}
            <path d="M35 55H85V75C85 78 82 80 79 80H41C38 80 35 78 35 75V55Z" fill="#FAF6F0" stroke="#1E1E1E" strokeWidth="2.5" />
            <rect x="30" y="50" width="60" height="5" rx="2" fill="#FF8B7B" stroke="#1E1E1E" strokeWidth="2" />
            
            {/* Robot Head Cook */}
            <rect x="45" y="15" width="30" height="24" rx="4" fill="#FFFFFF" stroke="#1E1E1E" strokeWidth="2.5" />
            <rect x="40" y="39" width="40" height="5" rx="2" fill="#1E1E1E" />
            {/* Cook Hat */}
            <path d="M48 15C48 9 53 6 60 6C67 6 72 9 72 15" fill="#FFB74D" stroke="#1E1E1E" strokeWidth="2" />
            {/* Robot eyes */}
            <circle cx="53" cy="27" r="2.5" fill="#B4D3FF" stroke="#1E1E1E" strokeWidth="1.5" />
            <circle cx="67" cy="27" r="2.5" fill="#B4D3FF" stroke="#1E1E1E" strokeWidth="1.5" />

            {/* Rising Steam lines with motion */}
            <path d="M45 42C43 45 43 48 45 50" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
            <path d="M60 42C58 45 58 48 60 50" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" className="animate-bounce" />
            <path d="M75 42C73 45 73 48 75 50" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
          </svg>
          
          {/* Label banner inside cooker circle */}
          <div className="absolute bottom-2 px-3 py-1 bg-white neo-border-thin rounded-full text-[8px] font-black tracking-wider uppercase text-gray-800 leading-none">
            AI IS COOKING
          </div>
        </div>

        {/* Text descriptions */}
        <div className="space-y-3 mb-6" id="cooking-modal-text">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 font-display flex items-center justify-center gap-2" id="cooking-modal-title">
            AI IS COOKING... 🧑‍🍳✨
          </h2>
          <p className="text-gray-600 font-bold text-xs md:text-sm max-w-sm mx-auto leading-relaxed" id="cooking-modal-desc">
            Sedang menyiapkan soal terbaik untuk kelasmu.<br />Mohon tunggu sebentar ya, Guru Hebat!
          </p>
        </div>

        {/* Custom Progress Bar */}
        <div className="w-full bg-white h-6 rounded-full neo-border overflow-hidden relative mb-6" id="cooking-progress-container">
          <div
            className="bg-[#FF8B7B] h-full neo-transition border-r-2 border-[#1E1E1E]"
            style={{ width: `${progress}%` }}
            id="cooking-progress-bar"
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-900" id="cooking-progress-label">
            {progress}% COMPLETED
          </span>
        </div>

        {/* Status badges row */}
        <div className="flex flex-wrap items-center justify-center gap-3" id="cooking-statuses-row">
          {/* Step 1: Analyzing Kurikulum */}
          <div
            className={`px-4 py-2 rounded-full neo-border-thin text-xs font-black transition-all ${
              step >= 1
                ? 'bg-[#C1F2D0] text-[#1E1E1E] scale-105'
                : 'bg-white text-gray-400 opacity-60'
            }`}
            id="cooking-status-1"
          >
            <div className="flex items-center gap-2">
              <span className="animate-ping w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
              <span>Analyzing Kurikulum</span>
            </div>
          </div>

          {/* Step 2: Generating Soal */}
          <div
            className={`px-4 py-2 rounded-full neo-border-thin text-xs font-black transition-all ${
              step >= 2
                ? 'bg-[#FF8B7B] text-[#1E1E1E] scale-105'
                : 'bg-white text-gray-400 opacity-60'
            }`}
            id="cooking-status-2"
          >
            <div className="flex items-center gap-2">
              <span className="animate-bounce text-xs">✨</span>
              <span>Generating Soal...</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
