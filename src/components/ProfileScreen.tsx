/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, Sparkles, User, School, BookOpen, GraduationCap, Star } from 'lucide-react';

interface ProfileScreenProps {
  profile: UserProfile;
  onBack: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
}

const PRESET_AVATARS = [
  '👩‍🏫', '👨‍🏫', '🧑‍🏫', '🧙', '🚀', '🎨', '🧪', '👾'
];

export default function ProfileScreen({ profile, onBack, onProfileUpdated }: ProfileScreenProps) {
  const [namaLengkap, setNamaLengkap] = useState(profile.nama_lengkap || '');
  const [sekolah, setSekolah] = useState(profile.sekolah || '');
  const [mataPelajaran, setMataPelajaran] = useState(profile.mata_pelajaran || '');
  const [kelas, setKelas] = useState(profile.kelas || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '👩‍🏫');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nama_lengkap: namaLengkap,
          sekolah,
          mata_pelajaran: mataPelajaran,
          kelas,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) {
        setErrorMsg('Data belum berhasil disimpan. Silakan coba lagi.');
      } else {
        setSuccessMsg('PROFIL BERHASIL DIPERBARUI! 🎉');
        onProfileUpdated({
          ...profile,
          nama_lengkap: namaLengkap,
          sekolah,
          mata_pelajaran: mataPelajaran,
          kelas,
          avatar_url: avatarUrl
        });
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan koneksi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-[#FAF6F0]" id="profile-container-screen">
      {/* Back button */}
      <button
        onClick={onBack}
        className="px-4 py-2.5 mb-6 bg-white neo-border-thin rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-all"
        id="profile-back-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>BACK</span>
      </button>

      <div className="mb-6" id="profile-headline">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display flex items-center gap-2">
          USER PROFILE <Sparkles className="w-6 h-6 text-[#FF8B7B]" />
        </h1>
        <p className="text-gray-600 font-bold text-sm mt-1">
          Kelola data diri dan identitas mengajar Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="profile-grid">
        {/* Left column: Avatar display & readonly info */}
        <div className="bg-white rounded-2xl neo-border neo-shadow p-6 text-center space-y-4" id="profile-avatar-panel">
          <div className="w-24 h-24 rounded-full bg-[#B4D3FF] neo-border flex items-center justify-center text-5xl mx-auto shadow-sm" id="profile-avatar-view">
            {avatarUrl || '👩‍🏫'}
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 leading-tight">{profile.nama_lengkap}</h3>
            <span className="text-xs text-gray-500 font-bold">@{profile.username}</span>
          </div>

          <div className="pt-4 border-t border-gray-100 text-left space-y-2.5" id="profile-meta-details">
            <div className="flex justify-between items-center text-xs font-bold" id="profile-role-meta">
              <span className="text-gray-400 uppercase">ROLE</span>
              <span className="px-2.5 py-0.5 bg-[#FFD166] rounded-full neo-border-thin text-[10px] font-black uppercase text-[#1E1E1E]">
                {profile.role}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold" id="profile-status-meta">
              <span className="text-gray-400 uppercase">STATUS</span>
              <span className="px-2.5 py-0.5 bg-[#C1F2D0] rounded-full neo-border-thin text-[10px] font-black uppercase text-[#1E1E1E]">
                {profile.status}
              </span>
            </div>
          </div>

          {/* Quick sticker card */}
          <div className="bg-[#B4D3FF] rounded-xl p-3 text-left flex items-start gap-2.5 relative overflow-hidden" id="profile-sticker-card">
            <Star className="w-5 h-5 fill-[#FFD166] text-gray-900 flex-shrink-0" />
            <p className="text-[10px] font-extrabold text-gray-800 leading-snug">
              Ingatlah untuk selalu memperbarui mata pelajaran utama agar rekomendasi pembuatan soal tetap relevan!
            </p>
          </div>
        </div>

        {/* Right column: Edit forms */}
        <div className="md:col-span-2 bg-white rounded-2xl neo-border neo-shadow p-6 lg:p-8" id="profile-form-panel">
          {successMsg && (
            <div className="mb-5 p-3.5 bg-[#C1F2D0] neo-border-thin text-xs font-bold rounded-xl flex items-center gap-2">
              <span>🎉</span> {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-[#FF8B7B] neo-border-thin text-xs font-bold rounded-xl flex items-center gap-2">
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5" id="profile-editor-form">
            
            {/* Avatar Picker presets */}
            <div className="space-y-2" id="avatar-picker-group">
              <label className="block text-xs font-black text-gray-900 uppercase tracking-wide">
                Pilih Emoji Avatar
              </label>
              <div className="flex flex-wrap gap-2.5" id="avatar-options">
                {PRESET_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatarUrl(emoji)}
                    className={`w-10 h-10 rounded-xl neo-border flex items-center justify-center text-xl cursor-pointer transition-all ${
                      avatarUrl === emoji
                        ? 'bg-[#FF8B7B] neo-shadow-sm scale-110'
                        : 'bg-[#FAF6F0] hover:bg-gray-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white neo-border-thin rounded-xl font-bold text-xs focus:outline-none focus:border-[#FF8B7B]"
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                  />
                </div>
              </div>

              {/* Username (READONLY) */}
              <div className="space-y-1.5 opacity-70">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wide">
                  Username (Tidak dapat diubah)
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 neo-border-thin rounded-xl font-bold text-xs text-gray-500 cursor-not-allowed"
                  value={`@${profile.username}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sekolah */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide">
                  Sekolah / Institusi
                </label>
                <div className="relative">
                  <School className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white neo-border-thin rounded-xl font-bold text-xs focus:outline-none focus:border-[#FF8B7B]"
                    placeholder="Contoh: SMAN 1 Jakarta"
                    value={sekolah}
                    onChange={(e) => setSekolah(e.target.value)}
                  />
                </div>
              </div>

              {/* Email (READONLY) */}
              <div className="space-y-1.5 opacity-70">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wide">
                  Email Account (Sistem)
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 neo-border-thin rounded-xl font-bold text-xs text-gray-500 cursor-not-allowed"
                  value={profile.email || '-'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mata Pelajaran */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide">
                  Mata Pelajaran Utama
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white neo-border-thin rounded-xl font-bold text-xs focus:outline-none focus:border-[#FF8B7B]"
                    placeholder="Contoh: Matematika"
                    value={mataPelajaran}
                    onChange={(e) => setMataPelajaran(e.target.value)}
                  />
                </div>
              </div>

              {/* Kelas */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide">
                  Tingkat Kelas Pengajaran
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white neo-border-thin rounded-xl font-bold text-xs focus:outline-none focus:border-[#FF8B7B]"
                    placeholder="Contoh: X, XI, XII"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Save profile changes */}
            <button
              type="submit"
              disabled={saving}
              className="w-full mt-4 py-3.5 bg-[#FF8B7B] text-gray-900 neo-border rounded-xl font-black text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer neo-shadow-sm neo-btn disabled:opacity-50"
              id="profile-save-submit-btn"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'SEDANG MENYIMPAN...' : 'SIMPAN PERUBAHAN'}</span>
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
