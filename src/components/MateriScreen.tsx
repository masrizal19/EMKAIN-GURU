/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Filter, 
  FileText, 
  Download, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  Layers, 
  BookMarked,
  X,
  CheckCircle,
  Eye
} from 'lucide-react';
import { UserProfile } from '../types';

interface MateriScreenProps {
  profile: UserProfile;
  onBack: () => void;
}

interface MateriItem {
  id: string;
  title: string;
  subject: string;
  grade: string;
  type: 'Modul PDF' | 'Slide Tayang' | 'LKPD' | 'Rangkuman AI';
  author: string;
  downloads: number;
  date: string;
  description: string;
  tags: string[];
}

const INITIAL_MATERI_LIST: MateriItem[] = [
  {
    id: 'mat-1',
    title: 'Modul Ajar: Aljabar Linier & Persamaan Kuadrat',
    subject: 'Matematika',
    grade: 'Kelas 9',
    type: 'Modul PDF',
    author: 'Dra. Siti Aminah',
    downloads: 142,
    date: '14 Feb 2026',
    description: 'Panduan lengkap pemahaman konsep rumus ABC, diskriminan, dan aplikasi fungsi kuadrat dalam kehidupan nyata.',
    tags: ['Aljabar', 'Kurikulum Merdeka', 'Latihan Soal']
  },
  {
    id: 'mat-2',
    title: 'Bahan Tayang: Sistem Peredaran Darah Manusia',
    subject: 'Ilmu Pengetahuan Alam (IPA)',
    grade: 'Kelas 8',
    type: 'Slide Tayang',
    author: 'Budi Santoso, M.Pd.',
    downloads: 98,
    date: '12 Feb 2026',
    description: 'Slide interaktif anatomi jantung, pembuluh darah, dan mekanisme peredaran darah besar & kecil.',
    tags: ['Biologi', 'Anatomi', 'Interaktif']
  },
  {
    id: 'mat-3',
    title: 'LKPD Mandiri: Menulis Teks Prosedur & Negosiasi',
    subject: 'Bahasa Indonesia',
    grade: 'Kelas 7',
    type: 'LKPD',
    author: 'Nurul Hidayati, S.Pd.',
    downloads: 85,
    date: '10 Feb 2026',
    description: 'Lembar Kerja Peserta Didik berbasis proyek untuk melatih kemampuan literasi dan komunikasi terstruktur.',
    tags: ['Teks Prosedur', 'Literasi', 'Tugas Kelompok']
  },
  {
    id: 'mat-4',
    title: 'Rangkuman AI: Dinamika Gerak Hukum Newton I, II, III',
    subject: 'Fisika',
    grade: 'Kelas 10',
    type: 'Rangkuman AI',
    author: 'AI Smart Assistant EMKAIN',
    downloads: 210,
    date: '08 Feb 2026',
    description: 'Ringkasan esensial gaya gravitasi, gaya gesek, dan diagram benda bebas dengan analogi praktis.',
    tags: ['Fisika', 'Hukum Newton', 'AI Summary']
  },
  {
    id: 'mat-5',
    title: 'Modul Ajar: Descriptive & Narrative Text Essentials',
    subject: 'Bahasa Inggris',
    grade: 'Kelas 8',
    type: 'Modul PDF',
    author: 'Linda Wijaya, S.Pd.',
    downloads: 77,
    date: '05 Feb 2026',
    description: 'Comprehensive guide to reading comprehension, vocabulary building, and grammar context in short stories.',
    tags: ['Grammar', 'Reading', 'Vocabulary']
  }
];

export default function MateriScreen({ profile, onBack }: MateriScreenProps) {
  const [materiList, setMateriList] = useState<MateriItem[]>(INITIAL_MATERI_LIST);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('Semua');
  const [selectedGrade, setSelectedGrade] = useState<string>('Semua');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingMateri, setViewingMateri] = useState<MateriItem | null>(null);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(profile.mata_pelajaran || 'Matematika');
  const [newGrade, setNewGrade] = useState(profile.kelas || 'Kelas 8');
  const [newType, setNewType] = useState<'Modul PDF' | 'Slide Tayang' | 'LKPD' | 'Rangkuman AI'>('Modul PDF');
  const [newDescription, setNewDescription] = useState('');
  const [newTags, setNewTags] = useState('');

  const subjects = ['Semua', 'Matematika', 'Ilmu Pengetahuan Alam (IPA)', 'Bahasa Indonesia', 'Bahasa Inggris', 'Fisika'];
  const grades = ['Semua', 'Kelas 7', 'Kelas 8', 'Kelas 9', 'Kelas 10', 'Kelas 11', 'Kelas 12'];

  const filteredMateri = materiList.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'Semua' || item.subject === selectedSubject;
    const matchesGrade = selectedGrade === 'Semua' || item.grade === selectedGrade;
    return matchesSearch && matchesSubject && matchesGrade;
  });

  const handleAddMateri = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    const newItem: MateriItem = {
      id: `mat-${Date.now()}`,
      title: newTitle.trim(),
      subject: newSubject,
      grade: newGrade,
      type: newType,
      author: profile.nama_lengkap || 'Guru EMKAIN',
      downloads: 0,
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      description: newDescription.trim(),
      tags: newTags ? newTags.split(',').map(t => t.trim()) : ['Modul Ajar']
    };

    setMateriList([newItem, ...materiList]);
    setNewTitle('');
    setNewDescription('');
    setNewTags('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in font-body" id="materi-screen-root">
      {/* Header Banner */}
      <div className="bg-[#FFD166] p-6 rounded-2xl neo-border neo-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="materi-header">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-white rounded-xl neo-border-thin text-xl">📚</span>
            <h1 className="text-2xl md:text-3xl font-black font-display text-gray-900 uppercase tracking-tight">
              Materi Pembelajaran
            </h1>
          </div>
          <p className="text-sm font-semibold text-gray-800">
            Pusat modul ajar, lembar kerja siswa (LKPD), bahan presentasi, dan rangkuman cerdas.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 bg-[#FF8B7B] hover:bg-[#ff9d90] text-gray-900 neo-border rounded-xl font-black text-xs uppercase tracking-wide flex items-center gap-2 cursor-pointer neo-shadow-sm neo-btn shrink-0"
          id="tambah-materi-btn"
        >
          <Plus className="w-4 h-4" />
          <span>Unggah Materi Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl neo-border neo-shadow space-y-4" id="materi-filter-container">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari judul materi, topik, atau nama penyusun..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#FAF6F0] rounded-xl neo-border font-medium text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF8B7B]"
              id="search-materi-input"
            />
          </div>

          {/* Subject Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3.5 py-3 bg-[#FAF6F0] rounded-xl neo-border font-bold text-xs text-gray-900 focus:outline-none cursor-pointer"
              id="filter-subject-select"
            >
              {subjects.map((sub) => (
                <option key={sub} value={sub}>{sub === 'Semua' ? 'Semua Mata Pelajaran' : sub}</option>
              ))}
            </select>
          </div>

          {/* Grade Dropdown */}
          <div className="w-full md:w-44">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-3.5 py-3 bg-[#FAF6F0] rounded-xl neo-border font-bold text-xs text-gray-900 focus:outline-none cursor-pointer"
              id="filter-grade-select"
            >
              {grades.map((gr) => (
                <option key={gr} value={gr}>{gr === 'Semua' ? 'Semua Kelas' : gr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Materi Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="materi-grid">
        {filteredMateri.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl neo-border neo-shadow p-5 flex flex-col justify-between hover:-translate-y-1 transition-all duration-200"
            id={`materi-card-${item.id}`}
          >
            <div>
              {/* Type and Grade Badges */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-lg neo-border-thin text-[10px] font-black uppercase tracking-wider ${
                  item.type === 'Modul PDF' ? 'bg-[#C1F2D0] text-gray-900' :
                  item.type === 'Slide Tayang' ? 'bg-[#A2D2FF] text-gray-900' :
                  item.type === 'Rangkuman AI' ? 'bg-[#FFD166] text-gray-900' : 'bg-[#FF8B7B] text-gray-900'
                }`}>
                  {item.type}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-600">
                  {item.grade}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-extrabold text-sm text-gray-900 line-clamp-2 mb-2 font-display">
                {item.title}
              </h3>

              {/* Subject */}
              <p className="text-xs font-bold text-[#FF8B7B] mb-2">{item.subject}</p>

              {/* Description */}
              <p className="text-xs font-medium text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                {item.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {item.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-[#FAF6F0] rounded text-[9px] font-bold text-gray-600">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer and Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                <span>👤 {item.author}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingMateri(item)}
                  className="p-2 bg-[#FAF6F0] hover:bg-gray-200 rounded-xl neo-border-thin text-gray-700 cursor-pointer"
                  title="Lihat Detail"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alert(`Mengunduh materi: ${item.title}`)}
                  className="px-3 py-1.5 bg-[#C1F2D0] hover:bg-[#a6e8b9] text-gray-900 neo-border-thin rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredMateri.length === 0 && (
          <div className="col-span-full p-12 bg-white rounded-2xl neo-border text-center space-y-3">
            <div className="text-4xl">🔍</div>
            <h3 className="font-extrabold text-sm text-gray-800 uppercase">Materi Tidak Ditemukan</h3>
            <p className="text-xs font-medium text-gray-500 max-w-sm mx-auto">
              Tidak ada materi pembelajaran yang cocok dengan kata kunci pencarian atau filter yang dipilih.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Detail Materi */}
      {viewingMateri && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl neo-border neo-shadow-lg max-w-lg w-full p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-1 bg-[#FFD166] neo-border-thin rounded-lg text-[10px] font-black uppercase text-gray-900">
                  {viewingMateri.type} • {viewingMateri.grade}
                </span>
                <h3 className="text-lg font-black font-display text-gray-900 mt-2">
                  {viewingMateri.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingMateri(null)}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 bg-[#FAF6F0] rounded-xl neo-border-thin space-y-2 text-xs">
              <div className="flex justify-between text-gray-600 font-bold">
                <span>Mata Pelajaran:</span>
                <span className="text-gray-900">{viewingMateri.subject}</span>
              </div>
              <div className="flex justify-between text-gray-600 font-bold">
                <span>Penyusun:</span>
                <span className="text-gray-900">{viewingMateri.author}</span>
              </div>
              <div className="flex justify-between text-gray-600 font-bold">
                <span>Tanggal Rilis:</span>
                <span className="text-gray-900">{viewingMateri.date}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-gray-900 uppercase mb-1">Deskripsi & Capaian Pembelajaran:</h4>
              <p className="text-xs font-medium text-gray-600 leading-relaxed">
                {viewingMateri.description}
              </p>
            </div>

            <div className="pt-3 flex gap-3">
              <button
                onClick={() => {
                  alert(`Membuka berkas: ${viewingMateri.title}`);
                  setViewingMateri(null);
                }}
                className="flex-1 py-3 bg-[#C1F2D0] hover:bg-[#a6e8b9] text-gray-900 neo-border rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Berkas Materi</span>
              </button>
              <button
                onClick={() => setViewingMateri(null)}
                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 neo-border-thin rounded-xl font-bold text-xs uppercase cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Materi Baru */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl neo-border neo-shadow-lg max-w-lg w-full p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#FFD166] rounded-lg neo-border-thin text-base">✏️</span>
                <h3 className="text-lg font-black font-display text-gray-900 uppercase">
                  Unggah Materi Baru
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddMateri} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Judul Materi Pembelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Modul Ajar Fotosintesis dan Klorofil..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-medium text-gray-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mata Pelajaran</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
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
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
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

              <div>
                <label className="block font-bold text-gray-700 mb-1">Format Tipe Materi</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none cursor-pointer"
                >
                  <option value="Modul PDF">Modul PDF</option>
                  <option value="Slide Tayang">Slide Tayang PPT</option>
                  <option value="LKPD">Lembar Kerja Siswa (LKPD)</option>
                  <option value="Rangkuman AI">Rangkuman Cerdas AI</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Ringkasan & Panduan Materi</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan ringkasan materi, kompetensi dasar, atau instruksi penggunaan bagi siswa..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF6F0] rounded-xl neo-border font-medium text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Kata Kunci / Tag (Pisahkan koma)</label>
                <input
                  type="text"
                  placeholder="Contoh: Kurikulum Merdeka, Bab 3, Eksperimen"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF6F0] rounded-xl neo-border font-medium text-gray-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#FF8B7B] hover:bg-[#ff9d90] text-gray-900 neo-border rounded-xl font-black text-xs uppercase cursor-pointer"
                >
                  Simpan & Publikasikan
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
