/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileCheck2, 
  Search, 
  Plus, 
  Clock, 
  Users, 
  CheckCircle2, 
  Play, 
  Printer, 
  KeyRound, 
  Copy, 
  Check, 
  X,
  BarChart2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';

interface UjianScreenProps {
  profile: UserProfile;
  onBack: () => void;
  onNavigateToGenerate?: () => void;
}

interface ExamPackage {
  id: string;
  title: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  totalQuestions: number;
  type: 'Pilihan Ganda' | 'Campuran' | 'Essay Mandiri';
  token: string;
  status: 'Aktif' | 'Terjadwal' | 'Selesai';
  participantsCount: number;
  avgScore: number;
  dateScheduled: string;
}

const INITIAL_EXAMS: ExamPackage[] = [
  {
    id: 'exam-101',
    title: 'Penilaian Tengah Semester (PTS) Genap Matematika',
    subject: 'Matematika',
    grade: 'Kelas 8',
    durationMinutes: 90,
    totalQuestions: 30,
    type: 'Pilihan Ganda',
    token: 'MAT8PTS',
    status: 'Aktif',
    participantsCount: 34,
    avgScore: 82.5,
    dateScheduled: '16 Feb 2026'
  },
  {
    id: 'exam-102',
    title: 'Kuis Harian: Ekosistem & Rantai Makanan Biologi',
    subject: 'Ilmu Pengetahuan Alam (IPA)',
    grade: 'Kelas 7',
    durationMinutes: 45,
    totalQuestions: 15,
    type: 'Campuran',
    token: 'IPAEKO7',
    status: 'Aktif',
    participantsCount: 32,
    avgScore: 88.0,
    dateScheduled: '17 Feb 2026'
  },
  {
    id: 'exam-103',
    title: 'Asesmen Formatif: Literasi Membaca & Menulis Puisi',
    subject: 'Bahasa Indonesia',
    grade: 'Kelas 9',
    durationMinutes: 60,
    totalQuestions: 20,
    type: 'Campuran',
    token: 'BINDO9LIT',
    status: 'Terjadwal',
    participantsCount: 0,
    avgScore: 0,
    dateScheduled: '20 Feb 2026'
  },
  {
    id: 'exam-104',
    title: 'English Diagnostic Test: Tenses & Comprehension',
    subject: 'Bahasa Inggris',
    grade: 'Kelas 8',
    durationMinutes: 60,
    totalQuestions: 25,
    type: 'Pilihan Ganda',
    token: 'ENG8DIAG',
    status: 'Selesai',
    participantsCount: 35,
    avgScore: 79.2,
    dateScheduled: '10 Feb 2026'
  }
];

export default function UjianScreen({ profile, onBack, onNavigateToGenerate }: UjianScreenProps) {
  const [exams, setExams] = useState<ExamPackage[]>(INITIAL_EXAMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Terjadwal' | 'Selesai'>('Semua');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamPackage | null>(null);

  // Form State
  const [examTitle, setExamTitle] = useState('');
  const [examSubject, setExamSubject] = useState(profile.mata_pelajaran || 'Matematika');
  const [examGrade, setExamGrade] = useState(profile.kelas || 'Kelas 8');
  const [examDuration, setExamDuration] = useState(60);
  const [examQuestions, setExamQuestions] = useState(20);
  const [examType, setExamType] = useState<'Pilihan Ganda' | 'Campuran' | 'Essay Mandiri'>('Pilihan Ganda');

  const filteredExams = exams.filter((ex) => {
    const matchesSearch = ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.token.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'Semua' || ex.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) return;

    // Generate random 6-character token
    const generatedToken = (examSubject.slice(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900));

    const newExam: ExamPackage = {
      id: `exam-${Date.now()}`,
      title: examTitle.trim(),
      subject: examSubject,
      grade: examGrade,
      durationMinutes: examDuration,
      totalQuestions: examQuestions,
      type: examType,
      token: generatedToken,
      status: 'Terjadwal',
      participantsCount: 0,
      avgScore: 0,
      dateScheduled: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    setExams([newExam, ...exams]);
    setExamTitle('');
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in font-body" id="ujian-screen-root">
      {/* Header Banner */}
      <div className="bg-[#FF8B7B] p-6 rounded-2xl neo-border neo-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="ujian-header">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-white rounded-xl neo-border-thin text-xl">📝</span>
            <h1 className="text-2xl md:text-3xl font-black font-display text-gray-900 uppercase tracking-tight">
              Pusat Ujian & Asesmen
            </h1>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            Kelola jadwal ujian kelas, buat paket soal asesmen, cetak lembar soal, dan pantau nilai siswa.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-3 bg-[#FFD166] hover:bg-[#ffe082] text-gray-900 neo-border rounded-xl font-black text-xs uppercase tracking-wide flex items-center gap-2 cursor-pointer neo-shadow-sm neo-btn shrink-0"
          id="buat-ujian-btn"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Paket Ujian</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl neo-border neo-shadow space-y-4" id="ujian-filter-container">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari judul ujian, mata pelajaran, atau token ujian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#FAF6F0] rounded-xl neo-border font-medium text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF8B7B]"
              id="search-ujian-input"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-[#FAF6F0] p-1.5 rounded-xl neo-border">
            {(['Semua', 'Aktif', 'Terjadwal', 'Selesai'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#1E1E1E] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" id="ujian-grid">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white rounded-2xl neo-border neo-shadow p-6 flex flex-col justify-between hover:-translate-y-0.5 transition-all"
            id={`exam-card-${exam.id}`}
          >
            <div>
              {/* Status Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-lg neo-border-thin text-[10px] font-black uppercase tracking-wider ${
                  exam.status === 'Aktif' ? 'bg-[#C1F2D0] text-gray-900 animate-pulse' :
                  exam.status === 'Terjadwal' ? 'bg-[#FFD166] text-gray-900' : 'bg-gray-200 text-gray-700'
                }`}>
                  ● Status: {exam.status}
                </span>

                <div className="flex items-center gap-1 bg-[#FAF6F0] px-2.5 py-1 rounded-lg neo-border-thin">
                  <span className="text-[10px] font-bold text-gray-500">Token Siswa:</span>
                  <span className="font-mono font-black text-xs text-gray-900">{exam.token}</span>
                  <button
                    onClick={() => handleCopyToken(exam.token)}
                    className="p-1 hover:bg-gray-200 rounded cursor-pointer"
                    title="Salin Token"
                  >
                    {copiedToken === exam.token ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-base font-extrabold text-gray-900 mb-1 font-display">
                {exam.title}
              </h3>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-gray-600 mb-4">
                <span className="text-[#FF8B7B]">{exam.subject}</span>
                <span>•</span>
                <span>{exam.grade}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {exam.durationMinutes} Menit</span>
                <span>•</span>
                <span>{exam.totalQuestions} Soal ({exam.type})</span>
              </div>

              {/* Quick Stat Blocks */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-[#FAF6F0] rounded-xl neo-border-thin flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#A2D2FF] neo-border-thin flex items-center justify-center text-sm font-black">
                    👥
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Partisipan</div>
                    <div className="text-sm font-black text-gray-900">{exam.participantsCount} Siswa</div>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF6F0] rounded-xl neo-border-thin flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#C1F2D0] neo-border-thin flex items-center justify-center text-sm font-black">
                    📊
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Rata-Rata Nilai</div>
                    <div className="text-sm font-black text-gray-900">{exam.avgScore > 0 ? `${exam.avgScore}/100` : '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold text-gray-400">
                🗓️ Jadwal: {exam.dateScheduled}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`Mencetak lembar ujian format cetak untuk: ${exam.title}`)}
                  className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-gray-200 text-gray-800 neo-border-thin rounded-xl font-bold text-[10px] uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Soal</span>
                </button>
                <button
                  onClick={() => setSelectedExam(exam)}
                  className="px-3 py-1.5 bg-[#FFD166] hover:bg-[#ffe082] text-gray-900 neo-border-thin rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Detail & Rekap</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredExams.length === 0 && (
          <div className="col-span-full p-12 bg-white rounded-2xl neo-border text-center space-y-3">
            <div className="text-4xl">📋</div>
            <h3 className="font-extrabold text-sm text-gray-800 uppercase">Paket Ujian Tidak Ditemukan</h3>
            <p className="text-xs font-medium text-gray-500 max-w-sm mx-auto">
              Belum ada asesmen yang sesuai dengan filter atau pencarian Anda. Klik Buat Paket Ujian untuk menjadwalkan asesmen baru.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Detail Rekap Ujian */}
      {selectedExam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl neo-border neo-shadow-lg max-w-lg w-full p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-1 bg-[#FFD166] neo-border-thin rounded-lg text-[10px] font-black uppercase text-gray-900">
                  {selectedExam.subject} • {selectedExam.grade}
                </span>
                <h3 className="text-lg font-black font-display text-gray-900 mt-2">
                  {selectedExam.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 bg-[#FAF6F0] rounded-xl neo-border-thin space-y-2 text-xs">
              <div className="flex justify-between font-bold text-gray-600">
                <span>Token Ujian:</span>
                <span className="font-mono font-black text-gray-900 text-sm bg-white px-2 py-0.5 rounded border">{selectedExam.token}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-600">
                <span>Durasi & Jumlah Soal:</span>
                <span className="text-gray-900">{selectedExam.durationMinutes} Menit ({selectedExam.totalQuestions} Soal)</span>
              </div>
              <div className="flex justify-between font-bold text-gray-600">
                <span>Siswa Mengikuti:</span>
                <span className="text-gray-900">{selectedExam.participantsCount} Siswa</span>
              </div>
              <div className="flex justify-between font-bold text-gray-600">
                <span>Rata-Rata Nilai Kelas:</span>
                <span className="text-green-700 font-extrabold">{selectedExam.avgScore > 0 ? `${selectedExam.avgScore} / 100` : 'Belum selesai'}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  alert(`Mengekspor rekap nilai siswa kelas ${selectedExam.grade} untuk ujian ${selectedExam.title}`);
                  setSelectedExam(null);
                }}
                className="flex-1 py-3 bg-[#C1F2D0] hover:bg-[#a6e8b9] text-gray-900 neo-border rounded-xl font-black text-xs uppercase cursor-pointer"
              >
                Unduh Rekap Nilai Siswa (Excel)
              </button>
              <button
                onClick={() => setSelectedExam(null)}
                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 neo-border-thin rounded-xl font-bold text-xs uppercase cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Buat Paket Ujian Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl neo-border neo-shadow-lg max-w-lg w-full p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#FF8B7B] rounded-lg neo-border-thin text-base">📝</span>
                <h3 className="text-lg font-black font-display text-gray-900 uppercase">
                  Jadwalkan Paket Ujian Baru
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Asesmen / Judul Ujian</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penilaian Harian Bab 2 Listrik Dinamis..."
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-medium text-gray-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mata Pelajaran</label>
                  <select
                    value={examSubject}
                    onChange={(e) => setExamSubject(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Matematika">Matematika</option>
                    <option value="Ilmu Pengetahuan Alam (IPA)">IPA</option>
                    <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                    <option value="Bahasa Inggris">Bahasa Inggris</option>
                    <option value="Fisika">Fisika</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jenjang Kelas</label>
                  <select
                    value={examGrade}
                    onChange={(e) => setExamGrade(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Kelas 7">Kelas 7</option>
                    <option value="Kelas 8">Kelas 8</option>
                    <option value="Kelas 9">Kelas 9</option>
                    <option value="Kelas 10">Kelas 10</option>
                    <option value="Kelas 11">Kelas 11</option>
                    <option value="Kelas 12">Kelas 12</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Durasi Pengerjaan (Menit)</label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={examDuration}
                    onChange={(e) => setExamDuration(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jumlah Butir Soal</label>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={examQuestions}
                    onChange={(e) => setExamQuestions(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Model Soal</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none cursor-pointer"
                >
                  <option value="Pilihan Ganda">Pilihan Ganda (Otomatis Dinilai)</option>
                  <option value="Campuran">Campuran (Pilihan Ganda + Uraian)</option>
                  <option value="Essay Mandiri">Essay Mandiri</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#FFD166] hover:bg-[#ffe082] text-gray-900 neo-border rounded-xl font-black text-xs uppercase cursor-pointer"
                >
                  Simpan & Rilis Token Ujian
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 neo-border-thin rounded-xl font-bold text-xs uppercase cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
