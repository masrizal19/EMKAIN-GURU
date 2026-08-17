/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: (userId: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loadingText, setLoadingText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim();

    // 1. Client-Side Input Validation (USER_INPUT_ERROR)
    if (!trimmedEmail) {
      setError('Email wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }

    if (!password) {
      setError('Password wajib diisi.');
      return;
    }

    setError('');
    
    if (!isSupabaseConfigured) {
      setError('Konfigurasi Supabase tidak tersedia. Silakan isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY pada pengaturan proyek atau GitHub Secrets.');
      console.error('[ENV ERROR] Supabase environment variables are not loaded in the client-side bundle.');
      return;
    }

    setLoadingText('MENGOTENTIKASI AKUN...');

    try {
      const normalizedEmail = trimmedEmail.toLowerCase();
      console.log('[LOGIN DEBUG] Memulai proses login untuk email:', normalizedEmail);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (authError) {
        console.error('[LOGIN ERROR]', authError);
        setLoadingText('');
        setPassword(''); // Clear password field on error for security

        const errMsg = (authError.message || '').toLowerCase();
        const errCode = (authError.code || '').toLowerCase();
        const status = (authError as any).status;

        // AUTHENTICATION_ERROR (Invalid email/password)
        if (
          errCode === 'invalid_credentials' ||
          errCode === 'invalid_grant' ||
          errMsg.includes('invalid login credentials') ||
          errMsg.includes('invalid_credentials') ||
          errMsg.includes('invalid credentials') ||
          status === 400
        ) {
          setError('Email atau password salah.');
          return;
        }

        // Supabase/network error
        setError('Tidak dapat terhubung ke layanan login. Silakan coba lagi.');
        return;
      }

      if (!data.session || !data.user) {
        console.error('[LOGIN ERROR] Sesi berhasil dibuat tetapi data session/user kosong.');
        setLoadingText('');
        setPassword('');
        setError('Sesi autentikasi tidak valid. Silakan coba lagi.');
        return;
      }

      console.log('[LOGIN DEBUG] Autentikasi Supabase berhasil. ID Pengguna:', data.user.id);
      setLoadingText('MEMVALIDASI PROFIL...');

      // Fetch the user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[LOGIN ERROR] Gagal mengambil profil dari Supabase Database:', profileError);
        setError('Tidak dapat terhubung ke layanan login. Silakan coba lagi.');
        setLoadingText('');
        setPassword('');
        return;
      }

      let activeProfile = profileData;

      // Auto-detect and handle Admin who was manually created and doesn't have a profile yet
      if (!activeProfile) {
        const userEmail = data.user.email;
        const isAdmin = userEmail && userEmail.toLowerCase() === 'admin@gmail.com';

        if (isAdmin) {
          activeProfile = {
            role: 'admin',
            status: 'aktif'
          };
          console.log('[LOGIN DEBUG] Profil kosong, mendeteksi admin default aktif.');
        } else {
          console.error('[LOGIN ERROR] Profil tidak ditemukan di database.');
          setLoadingText('');
          setPassword('');
          setError('Profil belum tersedia di database. Hubungi administrator.');
          await supabase.auth.signOut();
          return;
        }
      }

      // Verify if account status is active
      if (activeProfile.status === 'nonaktif') {
        console.warn('[LOGIN BLOCKED] Akun dinonaktifkan oleh administrator.');
        setLoadingText('');
        setPassword('');
        setError('Akun Anda tidak aktif. Hubungi administrator sekolah.');
        await supabase.auth.signOut();
        return;
      }

      console.log('[LOGIN DEBUG] Sesi login disetujui penuh.');
      setLoadingText('MASUK BERHASIL! 🎉');
      setTimeout(() => {
        onLoginSuccess(data.user.id);
      }, 500);
    } catch (err: any) {
      console.error('[LOGIN ERROR]', err);
      setLoadingText('');
      setPassword('');
      setError('Tidak dapat terhubung ke layanan login. Silakan coba lagi.');
    }
  };

  return (
    <div className="w-full max-w-5xl bg-[#FAF6F0] rounded-2xl neo-border neo-shadow-lg overflow-hidden flex flex-col md:flex-row" id="login-container">
      {/* Left Column: Branding and Illustration */}
      <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-between bg-[#FAF6F0] relative" id="login-left-panel">
        <div>
          {/* Slogan Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FF8B7B] rounded-full neo-border-thin text-xs font-bold uppercase tracking-wider text-[#1E1E1E]" id="ai-powered-badge">
            <span>AI Powered</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          
          {/* Main Slogan Title */}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#1E1E1E] mt-4 mb-3 font-display leading-[1.1]" id="login-title">
            Teaching made<br />easier.
          </h1>
          
          {/* Indonesian Description */}
          <p className="text-gray-700 font-medium text-sm md:text-base" id="login-subtitle">
            Semua kebutuhan pembelajaran guru, dalam satu tempat.
          </p>
        </div>

        {/* Vector Teacher Illustration */}
        <div className="my-8 flex justify-center items-center" id="teacher-illustration-container">
          <svg className="w-full max-w-[280px] h-auto" viewBox="0 0 300 220" fill="none" xmlns="http://www.w3.org/2000/svg" id="teacher-svg">
            {/* Background elements */}
            <rect x="20" y="20" width="260" height="180" rx="12" fill="#FAF6F0" stroke="#1E1E1E" strokeWidth="3" />
            <circle cx="230" cy="60" r="20" fill="#FFB74D" stroke="#1E1E1E" strokeWidth="3" />
            <path d="M40 180H260" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round" />
            
            {/* Grid Pattern inside drawing screen */}
            <path d="M60 40V160" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
            <path d="M100 40V160" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
            <path d="M140 40V160" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
            <path d="M180 40V160" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
            
            {/* Desk / Keyboard */}
            <rect x="70" y="150" width="130" height="25" rx="4" fill="#B4D3FF" stroke="#1E1E1E" strokeWidth="3" />
            
            {/* Teacher character sitting */}
            <path d="M110 160C110 110 160 110 160 160" fill="#FF8B7B" stroke="#1E1E1E" strokeWidth="3" />
            
            {/* Laptop screen */}
            <rect x="155" y="115" width="45" height="35" rx="3" fill="#FFFFFF" stroke="#1E1E1E" strokeWidth="3" />
            {/* Laptop bottom */}
            <path d="M150 150H205" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round" />
            {/* Sparkle star */}
            <path d="M210 100L213 105L219 106L214.5 110L216 116L210 113L204 116L205.5 110L201 106L207 105L210 100Z" fill="#FFD166" stroke="#1E1E1E" strokeWidth="2" />

            {/* Book/Documents */}
            <rect x="55" y="90" width="35" height="45" rx="4" transform="rotate(-15 55 90)" fill="#C1F2D0" stroke="#1E1E1E" strokeWidth="3" />
            <line x1="60" y1="105" x2="80" y2="100" stroke="#1E1E1E" strokeWidth="2.5" />
            <line x1="62" y1="115" x2="82" y2="110" stroke="#1E1E1E" strokeWidth="2.5" />
            
            {/* Teacher face details */}
            <circle cx="135" cy="110" r="14" fill="#FFD166" stroke="#1E1E1E" strokeWidth="3" />
            {/* Glasses */}
            <circle cx="130" cy="110" r="4" fill="none" stroke="#1E1E1E" strokeWidth="2" />
            <circle cx="140" cy="110" r="4" fill="none" stroke="#1E1E1E" strokeWidth="2" />
            <line x1="134" y1="110" x2="136" y2="110" stroke="#1E1E1E" strokeWidth="2" />
            {/* Hair */}
            <path d="M121 105C125 96 145 96 149 105C150 100 135 96 121 105Z" fill="#1E1E1E" stroke="#1E1E1E" strokeWidth="2" />
            {/* Happy mouth */}
            <path d="M132 118C133.5 120 136.5 120 138 118" stroke="#1E1E1E" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Floating Educational items */}
            <circle cx="70" cy="50" r="6" fill="#A2D2FF" stroke="#1E1E1E" strokeWidth="2" />
            <rect x="200" y="140" width="16" height="16" rx="4" fill="#FFD166" stroke="#1E1E1E" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Made for Teachers Badge */}
        <div className="flex justify-start" id="teachers-badge-container">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#A2D2FF] rounded-full neo-border-thin text-xs font-black uppercase tracking-wide text-gray-900" id="made-for-teachers-pill">
            <GraduationCap className="w-4 h-4" />
            <span>Made for Teachers</span>
          </div>
        </div>
      </div>

      {/* Middle Vertical Divider */}
      <div className="hidden md:block w-[3.5px] bg-[#1E1E1E] self-stretch" id="login-divider"></div>

      {/* Right Column: Form Access */}
      <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-[#FAF6F0]" id="login-right-panel">
        <div className="max-w-md w-full mx-auto" id="login-form-wrapper">
          <div className="mb-8" id="login-header-group">
            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-2 font-display" id="login-greet">
              Hello, Teacher! <span className="animate-bounce">👋</span>
            </h2>
            <p className="text-gray-600 font-medium text-sm mt-1" id="login-subgreet">
              Welcome back to EMKAIN GURU.
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-6 p-4 bg-[#FFD166] neo-border text-xs font-bold rounded-xl space-y-1.5 text-gray-900" id="login-config-warning">
              <div className="font-extrabold text-[13px] uppercase">⚠️ KONFIGURASI SUPABASE BELUM SELESAI</div>
              <p className="font-medium text-gray-800 leading-normal">
                Silakan isi variabel lingkungan <strong className="font-extrabold text-black">VITE_SUPABASE_URL</strong> dan <strong className="font-extrabold text-black">VITE_SUPABASE_PUBLISHABLE_KEY</strong> di menu Settings sebelum memulai agar autentikasi berjalan dengan normal.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-[#FF8B7B] neo-border-thin text-xs font-bold rounded-xl flex items-start gap-2 whitespace-pre-line text-gray-900" id="login-error">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span className="break-words leading-relaxed">{error}</span>
            </div>
          )}

          {loadingText && (
            <div className="mb-5 p-3.5 bg-[#B4D3FF] neo-border-thin text-xs font-black rounded-xl flex items-center gap-2 animate-pulse" id="login-loading">
              <span>⚡</span> {loadingText}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5" id="login-form">
            {/* Email Input */}
            <div className="space-y-2" id="email-group">
              <label className="block text-sm font-extrabold text-gray-900 tracking-wide uppercase" htmlFor="email-input">
                Email
              </label>
              <input
                id="email-input"
                type="email"
                required
                className="w-full px-4 py-3.5 bg-white neo-border rounded-xl font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-[#FF8B7B] focus:shadow-none transition-all duration-100"
                placeholder="guru@sekolah.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!loadingText}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2" id="password-group">
              <div className="flex justify-between items-center" id="password-label-row">
                <label className="block text-sm font-extrabold text-gray-900 tracking-wide uppercase" htmlFor="password-input">
                  Password
                </label>
                <span className="text-xs font-bold text-gray-500 cursor-not-allowed">
                  Hubungi admin untuk reset
                </span>
              </div>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-3.5 pr-12 bg-white neo-border rounded-xl font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-[#FF8B7B] focus:shadow-none transition-all duration-100"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!!loadingText}
                />
                <button
                  type="button"
                  id="toggle-password-visibility-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors p-1"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* MASUK Button */}
            <button
              id="masuk-submit-btn"
              type="submit"
              disabled={!!loadingText}
              className="w-full mt-2 py-4 bg-[#FF8B7B] text-[#1E1E1E] neo-border rounded-xl font-black text-lg tracking-wide flex items-center justify-center gap-2 cursor-pointer neo-shadow neo-btn disabled:opacity-50"
            >
              <span>MASUK</span>
              <span className="text-xl">→</span>
            </button>
          </form>

          {/* Prompt footer */}
          <div className="mt-8 text-center" id="login-footer">
            <p className="text-sm font-bold text-gray-600 mb-2" id="register-prompt">
              Belum punya akun? <a href="#/register" className="text-[#FF8B7B] font-extrabold underline hover:text-[#ff9f8f]">Daftar Akun Guru</a>
            </p>
            <p className="text-xs font-bold text-gray-500" id="forget-prompt">
              Lupa akses? Hubungi Administrator Sekolah
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
