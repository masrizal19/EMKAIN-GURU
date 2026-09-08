/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Copy, Share2, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { createGameRoomApi } from '../../lib/game_store';
import { GameRoom } from '../../types';

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId?: string;
  creatorName?: string;
  onGameCreated: (room: GameRoom) => void;
}

interface QuestionDraft {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
}

const SAMPLE_QUESTIONS: QuestionDraft[] = [
  {
    question: 'Protokol jaringan komputer yang bertanggung jawab mengatur pengalamatan IP pada komputer klien secara otomatis adalah...',
    option_a: 'DNS (Domain Name System)',
    option_b: 'DHCP (Dynamic Host Configuration Protocol)',
    option_c: 'FTP (File Transfer Protocol)',
    option_d: 'HTTP (Hypertext Transfer Protocol)',
    correct_answer: 'B'
  },
  {
    question: 'Topologi jaringan yang menggunakan konsentrator seperti switch atau hub sebagai pusat penghubung seluruh komputer dinamakan...',
    option_a: 'Topologi Star (Bintang)',
    option_b: 'Topologi Bus',
    option_c: 'Topologi Ring (Cincin)',
    option_d: 'Topologi Mesh',
    correct_answer: 'A'
  },
  {
    question: 'Urutan warna standar kabel UTP straight-through T568B dari kiri ke kanan adalah...',
    option_a: 'Putih Hijau, Hijau, Putih Orange, Biru, Putih Biru, Orange, Putih Cokelat, Cokelat',
    option_b: 'Putih Orange, Orange, Putih Hijau, Biru, Putih Biru, Hijau, Putih Cokelat, Cokelat',
    option_c: 'Putih Biru, Biru, Putih Orange, Hijau, Putih Hijau, Orange, Putih Cokelat, Cokelat',
    option_d: 'Putih Cokelat, Cokelat, Putih Orange, Biru, Putih Biru, Hijau, Putih Hijau, Orange',
    correct_answer: 'B'
  },
  {
    question: 'Komponen hardware komputer yang berfungsi sebagai otak utama dalam memproses seluruh instruksi program adalah...',
    option_a: 'Power Supply Unit (PSU)',
    option_b: 'Central Processing Unit (CPU)',
    option_c: 'Random Access Memory (RAM)',
    option_d: 'Solid State Drive (SSD)',
    correct_answer: 'B'
  },
  {
    question: 'Di antara pilihan berikut, manakah port default yang digunakan oleh protokol HTTPS untuk komunikasi web terenkripsi?',
    option_a: 'Port 80',
    option_b: 'Port 21',
    option_c: 'Port 443',
    option_d: 'Port 8080',
    correct_answer: 'C'
  }
];

export const CreateGameModal: React.FC<CreateGameModalProps> = ({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  onGameCreated
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(20);
  
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => {
    return Array.from({ length: 5 }, () => ({
      question: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A'
    }));
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<GameRoom | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCountChange = (newCount: number) => {
    const clamped = Math.max(5, Math.min(20, newCount));
    setQuestionCount(clamped);
    setQuestions(prev => {
      if (prev.length < clamped) {
        const additional = Array.from({ length: clamped - prev.length }, () => ({
          question: '',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_answer: 'A' as const
        }));
        return [...prev, ...additional];
      }
      return prev.slice(0, clamped);
    });
    if (currentIdx >= clamped) {
      setCurrentIdx(clamped - 1);
    }
  };

  const handleQuestionFieldChange = (field: keyof QuestionDraft, value: string) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[currentIdx] = {
        ...copy[currentIdx],
        [field]: value
      };
      return copy;
    });
  };

  const handleFillSample = () => {
    setTitle('Kuis Cepat Jaringan & Komputer XII');
    setSubject('Teknologi Jaringan Komputer');
    setClassLevel('XII TKJ 1');
    setQuestionCount(5);
    setTimePerQuestion(20);
    setQuestions(SAMPLE_QUESTIONS.map(q => ({ ...q })));
    setCurrentIdx(0);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Judul Game wajib diisi.');
      return;
    }
    if (!subject.trim()) {
      setError('Mata Pelajaran wajib diisi.');
      return;
    }
    if (!classLevel.trim()) {
      setError('Kelas wajib diisi.');
      return;
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setError(`Soal ${i + 1} belum memiliki teks pertanyaan.`);
        setCurrentIdx(i);
        return;
      }
      if (!q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) {
        setError(`Soal ${i + 1} harus memiliki semua pilihan jawaban A, B, C, dan D lengkap.`);
        setCurrentIdx(i);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await createGameRoomApi({
        title: title.trim(),
        subject: subject.trim(),
        class_level: classLevel.trim(),
        question_count: questions.length,
        time_per_question: timePerQuestion,
        questions: questions.map(q => ({
          question: q.question.trim(),
          option_a: q.option_a.trim(),
          option_b: q.option_b.trim(),
          option_c: q.option_c.trim(),
          option_d: q.option_d.trim(),
          correct_answer: q.correct_answer
        })),
        creator_id: creatorId,
        creator_name: creatorName
      });

      if (res.success && res.room) {
        setCreatedRoom(res.room);
      } else {
        setError(res.error || 'Gagal membuat room kuis.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  const gameJoinUrl = createdRoom 
    ? `${window.location.origin}${window.location.pathname}#/game/join/${createdRoom.room_code}`
    : '';

  const handleCopyLink = () => {
    if (!gameJoinUrl) return;
    navigator.clipboard.writeText(gameJoinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!createdRoom) return;
    const shareText = `Yuk ikuti Game Kuis EMKAIN: ${createdRoom.title}!\nKode: ${createdRoom.room_code}\nPIN: ${createdRoom.pin}\nLink: ${gameJoinUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: createdRoom.title,
          text: shareText,
          url: gameJoinUrl
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-50 overflow-y-auto font-body">
      <div className="bg-[#FAF6F0] rounded-2xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        
        {/* MODAL HEADER */}
        <div className="p-4 md:p-5 bg-[#FFD166] border-b-2 border-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎮</span>
            <div>
              <h2 className="text-lg md:text-xl font-black font-display uppercase tracking-tight text-gray-900 leading-none">
                {createdRoom ? 'GAME SIAP DIMAINKAN!' : 'BUAT GAME KUIS REALTIME'}
              </h2>
              <p className="text-[11px] font-bold text-gray-700 mt-0.5">
                {createdRoom ? 'Bagikan PIN & link ke siswa Anda untuk mulai kuis' : 'Atur info game dan susun 5 - 20 butir soal kuis'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white rounded-lg border-2 border-gray-900 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-900" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-6">
          
          {createdRoom ? (
            /* SUCCESS VIEW: GAME READY TO SHARE */
            <div className="space-y-6 text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C1F2D0] border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] text-3xl mx-auto">
                🎉
              </div>

              <div>
                <h3 className="text-2xl font-black font-display uppercase text-gray-900">
                  {createdRoom.title}
                </h3>
                <p className="text-xs font-bold text-gray-600 mt-1">
                  {createdRoom.subject} • {createdRoom.class_level} • {createdRoom.question_count} Soal • {createdRoom.time_per_question} Detik/Soal
                </p>
              </div>

              {/* PIN & CODE CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="p-4 bg-white rounded-xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">PIN GAME</div>
                  <div className="text-3xl font-black tracking-wider text-[#1E1E1E] font-display mt-1">
                    {createdRoom.pin}
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">KODE ROOM</div>
                  <div className="text-3xl font-black tracking-wider text-blue-600 font-display mt-1">
                    {createdRoom.room_code}
                  </div>
                </div>
              </div>

              {/* LINK DISPLAY BOX */}
              <div className="p-4 bg-[#B4D3FF]/40 rounded-xl border-2 border-gray-900 max-w-xl mx-auto text-left space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-gray-800">
                  LINK GAME UNTUK SISWA
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-gray-900 text-xs font-mono font-bold text-gray-700 break-all select-all">
                  {gameJoinUrl}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-gray-50 border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'LINK TERSALIN!' : 'SALIN LINK'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FFD166] hover:bg-yellow-300 border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>BAGIKAN GAME</span>
                  </button>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => onGameCreated(createdRoom)}
                  className="w-full py-3.5 px-6 bg-[#C1F2D0] hover:bg-emerald-300 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-sm uppercase tracking-wider cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                >
                  <span>BUKA LOBBY GURU</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* CREATE FORM */
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* TOP ACTIONS: SAMPLE FILL BUTTON */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-300">
                <span className="text-xs font-black uppercase text-gray-500 tracking-wider">
                  INFORMASI UTAMA GAME
                </span>
                <button
                  type="button"
                  onClick={handleFillSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD166] hover:bg-yellow-300 text-gray-900 border-2 border-gray-900 rounded-lg text-xs font-black uppercase cursor-pointer shadow-[1px_1px_0_rgba(0,0,0,1)]"
                  title="Isi otomatis 5 contoh soal siap pakai"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ISI CONTOH SOAL OTOMATIS</span>
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-100 border-2 border-red-600 rounded-xl text-red-800 text-xs font-bold">
                  {error}
                </div>
              )}

              {/* METADATA GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-900">
                    JUDUL GAME <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Kuis Interaktif Jaringan Dasar XII"
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border-2 border-gray-900 text-sm font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-yellow-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-900">
                    MATA PELAJARAN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Contoh: Informatika / TKJ"
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border-2 border-gray-900 text-sm font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-yellow-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-900">
                    KELAS <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value)}
                    placeholder="Contoh: XII TKJ 1"
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border-2 border-gray-900 text-sm font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-yellow-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-900">
                    WAKTU PER SOAL
                  </label>
                  <select
                    value={timePerQuestion}
                    onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border-2 border-gray-900 text-sm font-bold text-gray-900 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value={10}>10 Detik (Sangat Cepat)</option>
                    <option value={15}>15 Detik (Cepat)</option>
                    <option value={20}>20 Detik (Standar)</option>
                    <option value={30}>30 Detik (Santai)</option>
                    <option value={45}>45 Detik (Panjang)</option>
                    <option value={60}>60 Detik (1 Menit)</option>
                  </select>
                </div>
              </div>

              {/* QUESTION COUNT PICKER */}
              <div className="p-4 bg-white rounded-xl border-2 border-gray-900 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-900">
                    JUMLAH SOAL (5 - 20 SOAL):
                  </label>
                  <span className="px-3 py-1 bg-[#B4D3FF] rounded-full border-2 border-gray-900 text-xs font-black">
                    {questionCount} BUTIR SOAL
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={20}
                    value={questionCount}
                    onChange={(e) => handleCountChange(Number(e.target.value))}
                    className="w-full accent-gray-900 cursor-pointer"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {[5, 10, 15, 20].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleCountChange(num)}
                        className={`px-2.5 py-1 text-xs font-black rounded-lg border border-gray-900 cursor-pointer transition-all ${
                          questionCount === num ? 'bg-[#FF8B7B] text-gray-900 shadow-[1px_1px_0_rgba(0,0,0,1)]' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* QUESTION TABS NAVIGATION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-900">
                    SUSUNAN BUTIR SOAL:
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    Sedang mengedit Soal {currentIdx + 1} dari {questionCount}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
                  {questions.map((q, idx) => {
                    const isFilled = !!q.question.trim();
                    const isActive = currentIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentIdx(idx)}
                        className={`px-3 py-1.5 rounded-lg border-2 border-gray-900 text-xs font-black uppercase cursor-pointer flex-shrink-0 transition-all ${
                          isActive
                            ? 'bg-[#FF8B7B] text-gray-900 shadow-[2px_2px_0_rgba(0,0,0,1)] translate-x-0.5'
                            : isFilled
                            ? 'bg-[#C1F2D0] text-gray-900 hover:bg-emerald-200'
                            : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        SOAL {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ACTIVE QUESTION EDITOR CARD */}
              <div className="p-4 md:p-5 bg-white rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <h4 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#FFD166] border border-gray-900 flex items-center justify-center text-xs">
                      {currentIdx + 1}
                    </span>
                    <span>PERTANYAAN SOAL {currentIdx + 1}</span>
                  </h4>
                  <div className="text-[11px] font-bold text-gray-400">
                    Wajib diisi lengkap
                  </div>
                </div>

                {/* TEXTAREA PERTANYAAN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-700">
                    Teks Pertanyaan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={questions[currentIdx]?.question || ''}
                    onChange={(e) => handleQuestionFieldChange('question', e.target.value)}
                    placeholder="Ketikkan teks pertanyaan kuis di sini..."
                    className="w-full p-3 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 text-sm font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-yellow-400 leading-relaxed [overflow-wrap:anywhere]"
                    required
                  />
                </div>

                {/* PILIHAN JAWABAN A, B, C, D */}
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-black uppercase tracking-wider text-gray-700">
                    PILIHAN JAWABAN & TENTUKAN KUNCI JAWABAN BENAR:
                  </div>

                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const fieldKey = `option_${opt.toLowerCase()}` as keyof QuestionDraft;
                    const isCorrect = questions[currentIdx]?.correct_answer === opt;
                    const badgeColors: Record<string, string> = {
                      A: 'bg-[#FF8B7B]',
                      B: 'bg-[#B4D3FF]',
                      C: 'bg-[#FFD166]',
                      D: 'bg-[#C1F2D0]'
                    };

                    return (
                      <div
                        key={opt}
                        className={`p-2.5 md:p-3 rounded-xl border-2 border-gray-900 transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ${
                          isCorrect ? 'bg-amber-50 shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`w-8 h-8 rounded-lg border-2 border-gray-900 flex items-center justify-center font-black text-xs text-gray-900 ${badgeColors[opt]}`}>
                            {opt}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuestionFieldChange('correct_answer', opt)}
                            className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border cursor-pointer transition-all ${
                              isCorrect
                                ? 'bg-emerald-500 text-white border-emerald-700 shadow-xs'
                                : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            {isCorrect ? '✓ KUNCI BENAR' : 'SET BENAR'}
                          </button>
                        </div>

                        <input
                          type="text"
                          value={(questions[currentIdx] as any)?.[fieldKey] || ''}
                          onChange={(e) => handleQuestionFieldChange(fieldKey, e.target.value)}
                          placeholder={`Ketikkan teks pilihan jawaban ${opt}...`}
                          className="flex-1 px-3 py-1.5 bg-transparent text-xs md:text-sm font-bold text-gray-900 border-b-2 sm:border-b-0 sm:border-l-2 border-gray-300 focus:border-gray-900 focus:outline-hidden"
                          required
                        />
                      </div>
                    );
                  })}
                </div>

                {/* STEPPER BUTTONS */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-gray-900 text-xs font-bold text-gray-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>SOAL SEBELUMNYA</span>
                  </button>

                  <button
                    type="button"
                    disabled={currentIdx === questionCount - 1}
                    onClick={() => setCurrentIdx(prev => Math.min(questionCount - 1, prev + 1))}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#B4D3FF] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-gray-900 text-xs font-black text-gray-900 cursor-pointer"
                  >
                    <span>SOAL BERIKUTNYA</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto py-2.5 px-5 bg-white border-2 border-gray-900 rounded-xl font-bold text-xs uppercase cursor-pointer text-gray-700"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto py-3 px-7 bg-[#FFD166] hover:bg-yellow-300 disabled:opacity-50 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? 'MENYIAPKAN ROOM...' : 'SIMPAN & BUAT GAME'}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
