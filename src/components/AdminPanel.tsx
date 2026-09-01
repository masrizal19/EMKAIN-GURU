/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { getApiUrl } from '../lib/api';
import { 
  Search, 
  UserPlus, 
  ShieldAlert, 
  Sparkles, 
  UserCheck, 
  UserX, 
  ArrowLeft, 
  Plus, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Key, 
  X, 
  EyeOff 
} from 'lucide-react';

interface AdminPanelProps {
  onBack: () => void;
  initialAction?: 'list' | 'create' | 'edit' | 'delete';
}

export default function AdminPanel({ onBack, initialAction }: AdminPanelProps) {
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aktif' | 'nonaktif'>('all');

  // Form states for creating new guru
  const [showCreateForm, setShowCreateForm] = useState(initialAction === 'create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [sekolah, setSekolah] = useState('');
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [kelas, setKelas] = useState('');
  
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdTeacherInfo, setCreatedTeacherInfo] = useState<UserProfile | null>(null);

  // Modals for Actions
  const [viewingTeacher, setViewingTeacher] = useState<UserProfile | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<UserProfile | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<UserProfile | null>(null);
  const [resettingTeacher, setResettingTeacher] = useState<UserProfile | null>(null);

  // Form states for editing guru
  const [editNamaLengkap, setEditNamaLengkap] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editSekolah, setEditSekolah] = useState('');
  const [editMataPelajaran, setEditMataPelajaran] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editStatus, setEditStatus] = useState<'aktif' | 'nonaktif'>('aktif');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch all teachers
  const fetchTeachers = async () => {
    setLoading(true);
    let apiFetchedSuccessfully = false;
    try {
      const token = await getValidToken();
      if (token) {
        try {
          const response = await fetch(getApiUrl('/api/admin/teachers'), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const result = await response.json();
            if (result.success && Array.isArray(result.teachers)) {
              setTeachers(result.teachers);
              apiFetchedSuccessfully = true;
            }
          }
        } catch (apiErr) {
          console.warn('Backend API fetching failed, falling back to direct Supabase query:', apiErr);
        }
      }

      if (!apiFetchedSuccessfully) {
        // Fallback to client query if backend unreachable or failed
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'guru')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching teachers via Supabase fallback:', error);
        } else {
          setTeachers((data as UserProfile[]) || []);
        }
      }
    } catch (err) {
      console.error('Network error fetching teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Filtered teachers list (Lookup fields: nama, email, username, sekolah, mata pelajaran)
  const filteredTeachers = teachers.filter((teacher) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (teacher.nama_lengkap || '').toLowerCase().includes(query) ||
      (teacher.email || '').toLowerCase().includes(query) ||
      (teacher.username || '').toLowerCase().includes(query) ||
      (teacher.sekolah || '').toLowerCase().includes(query) ||
      (teacher.mata_pelajaran || '').toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || teacher.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Helper to ensure a fresh valid access token and active session
  const getValidToken = async (): Promise<string | null> => {
    let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      // If no active session exists locally, do not attempt a failing refresh
      return null;
    }

    // Also verify user is active
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshedData.session) {
        return null;
      }
      return refreshedData.session.access_token;
    }

    return sessionData.session.access_token;
  };

  // Toggle status (aktif <-> nonaktif) via server-side secure edit endpoint
  const toggleTeacherStatus = async (teacher: UserProfile) => {
    const newStatus = teacher.status === 'aktif' ? 'nonaktif' : 'aktif';
    try {
      const token = await getValidToken();

      if (!token) {
        alert('Sesi admin kedaluwarsa. Silakan login kembali.');
        return;
      }

      const response = await fetch(getApiUrl('/api/admin/edit-user'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: teacher.id,
          username: teacher.username,
          nama_lengkap: teacher.nama_lengkap,
          sekolah: teacher.sekolah,
          mata_pelajaran: teacher.mata_pelajaran,
          kelas: teacher.kelas,
          status: newStatus
        })
      });

      if (!response.ok) {
        const resData = await response.json();
        alert('Gagal mengubah status: ' + (resData.message || 'Error'));
      } else {
        fetchTeachers();
      }
    } catch (err: any) {
      alert('Terjadi kesalahan koneksi.');
    }
  };

  // Submit new guru registration to backend
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    setCreatedTeacherInfo(null);

    // Frontend quick validation
    if (password.length < 6) {
      setCreateError('PASSWORD TIDAK MEMENUHI PERSYARATAN');
      setCreateLoading(false);
      return;
    }

    try {
      const token = await getValidToken();

      if (!token) {
        setCreateError('Sesi admin kedaluwarsa. Silakan login kembali.');
        setCreateLoading(false);
        return;
      }

      const response = await fetch(getApiUrl('/api/admin/create-user'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          password,
          username,
          nama_lengkap: namaLengkap,
          sekolah,
          mata_pelajaran: mataPelajaran,
          kelas,
          status: 'aktif'
        })
      });

      let resData;
      try {
        resData = await response.json();
      } catch (parseError) {
        console.error('Error parsing response JSON in create-user:', parseError);
        setCreateError(`Error dari server (${response.status}): Gagal membaca respons. Pastikan URL API benar.`);
        setCreateLoading(false);
        return;
      }

      if (!response.ok) {
        const errMsg = resData.message || '';
        const errType = resData.error || '';

        console.error('[DEV_ADMIN_CREATE_TEACHER_FAILED]', {
          status: response.status,
          error: errType,
          message: errMsg
        });

        if (errType === 'USERNAME_ALREADY_EXISTS' || errType === 'USERNAME_TAKEN' || errMsg.toLowerCase().includes('username')) {
          setCreateError('USERNAME SUDAH DIGUNAKAN');
        } else if (errMsg.includes('already registered') || errMsg.toLowerCase().includes('email') || errType.toLowerCase().includes('email')) {
          setCreateError('EMAIL SUDAH TERDAFTAR');
        } else if (errMsg.toLowerCase().includes('password') || errType.toLowerCase().includes('password')) {
          setCreateError('PASSWORD TIDAK MEMENUHI PERSYARATAN');
        } else {
          setCreateError(`GAGAL MEMBUAT AKUN (${errType || response.status}): ${errMsg}`);
        }
      } else {
        // Success info payload
        const successUser: UserProfile = {
          id: resData.user.id,
          username: username,
          nama_lengkap: namaLengkap,
          email: email,
          sekolah: sekolah,
          mata_pelajaran: mataPelajaran,
          kelas: kelas,
          avatar_url: null,
          status: 'aktif',
          role: 'guru'
        };
        setCreatedTeacherInfo(successUser);

        // Refresh teacher list immediately
        fetchTeachers();

        // Clear form fields
        setEmail('');
        setPassword('');
        setUsername('');
        setNamaLengkap('');
        setSekolah('');
        setMataPelajaran('');
        setKelas('');
      }
    } catch (err: any) {
      console.error('FETCH CATCH ERROR:', err); setCreateError('Kesalahan koneksi ke server: ' + err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Submit guru edits to backend
  const handleEditTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setEditLoading(true);
    setEditError('');

    try {
      const token = await getValidToken();

      if (!token) {
        setEditError('Sesi admin kedaluwarsa. Silakan login kembali.');
        setEditLoading(false);
        return;
      }

      const response = await fetch(getApiUrl('/api/admin/edit-user'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: editingTeacher.id,
          username: editUsername,
          nama_lengkap: editNamaLengkap,
          sekolah: editSekolah,
          mata_pelajaran: editMataPelajaran,
          kelas: editKelas,
          status: editStatus
        })
      });

      let resData;
      try {
        resData = await response.json();
      } catch (parseError) {
        setEditError(`Error server (${response.status}): Gagal membaca respons.`);
        setEditLoading(false);
        return;
      }

      if (!response.ok) {
        const errMsg = resData.message || '';
        const errType = resData.error || '';

        if (errType === 'USERNAME_TAKEN' || errMsg.toLowerCase().includes('username')) {
          setEditError('USERNAME SUDAH DIGUNAKAN');
        } else {
          setEditError(errMsg || 'Gagal mengubah profil guru.');
        }
      } else {
        setEditingTeacher(null);
        fetchTeachers();
      }
    } catch (err: any) {
      console.error('[DEV_EDIT_USER_EXCEPTION]', err);
      setEditError(`Kesalahan koneksi: ${err.message || err}`);
    } finally {
      setEditLoading(false);
    }
  };

  // Submit delete request to backend
  const handleDeleteTeacherSubmit = async () => {
    if (!deletingTeacher) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      const token = await getValidToken();

      if (!token) {
        setDeleteError('SESI ADMIN TIDAK VALID. Silakan login kembali sebagai administrator.');
        setDeleteLoading(false);
        return;
      }

      console.log('[DELETE USER DEBUG] target user id:', deletingTeacher.id, 'target email:', deletingTeacher.email);

      let responseOk = false;
      let resData: any = null;

      try {
        console.log('[DELETE USER DEBUG] Attempting to invoke Supabase Edge Function "delete-user"...');
        const { data: funcData, error: funcError } = await supabase.functions.invoke('delete-user', {
          body: { userId: deletingTeacher.id }
        });

        if (funcError) {
          console.warn('[DELETE USER DEBUG] Edge Function invocation warning/error:', funcError);
          throw funcError;
        }

        console.log('[DELETE USER DEBUG] Edge Function invoked successfully:', funcData);
        responseOk = true;
        resData = funcData;
      } catch (edgeErr: any) {
        console.warn('[DELETE USER DEBUG] Edge Function failed/not found, falling back to Express API...', edgeErr);
        
        const response = await fetch(getApiUrl('/api/admin/delete-user'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: deletingTeacher.id
          })
        });

        resData = await response.json();
        responseOk = response.ok;
      }

      if (!responseOk) {
        console.error('[DELETE USER ERROR]', resData);
        const errMsg = resData?.error?.message || resData?.message || 'Gagal menghapus akun guru.';
        setDeleteError(errMsg);
      } else {
        setDeletingTeacher(null);
        fetchTeachers();
      }
    } catch (err: any) {
      console.error('[DELETE USER EXCEPTION]', err);
      setDeleteError(`Kesalahan koneksi: ${err.message || err}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Stats aggregators (100% real-data derived from state populated by Supabase Query)
  const totalCount = teachers.length;
  const activeCount = teachers.filter((t) => t.status === 'aktif').length;
  const nonActiveCount = teachers.filter((t) => t.status === 'nonaktif').length;

  return (
    <div className="w-full max-w-5xl bg-[#FAF6F0]" id="admin-panel-container">
      {/* Back button */}
      <button
        onClick={onBack}
        className="px-4 py-2.5 mb-6 bg-white neo-border-thin rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-all"
        id="admin-back-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>BACK TO WORKSPACE</span>
      </button>

      {/* Headline */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6" id="admin-headline">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display flex items-center gap-2">
            ADMINISTRATOR PANEL <Sparkles className="w-6 h-6 text-[#FF8B7B]" />
          </h1>
          <p className="text-gray-600 font-bold text-sm mt-1">
            Kelola data akun tenaga pengajar, perizinan akses, dan audit profil guru.
          </p>
        </div>
        
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setCreatedTeacherInfo(null);
            setCreateError('');
          }}
          className="px-5 py-3.5 bg-[#FF8B7B] text-gray-900 neo-border rounded-xl font-black text-xs tracking-wider uppercase flex items-center gap-1.5 cursor-pointer neo-shadow-sm hover:bg-[#ff9f8f]"
          id="toggle-add-guru-btn"
        >
          <Plus className="w-4 h-4" />
          <span>TAMBAH GURU BARU</span>
        </button>
      </div>

      {/* Analytics Counter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8" id="admin-stats-row">
        <div className="bg-white rounded-xl neo-border p-5 text-left" id="stat-total">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Total Guru Terdaftar</span>
          <div className="text-3xl font-black text-[#1E1E1E] mt-1">{totalCount}</div>
        </div>
        <div className="bg-[#C1F2D0] rounded-xl neo-border p-5 text-left" id="stat-aktif">
          <span className="text-[10px] font-black uppercase text-gray-600 tracking-wider">Guru Status Aktif</span>
          <div className="text-3xl font-black text-[#1E1E1E] mt-1">{activeCount}</div>
        </div>
        <div className="bg-[#FF8B7B] rounded-xl neo-border p-5 text-left" id="stat-nonaktif">
          <span className="text-[10px] font-black uppercase text-gray-800 tracking-wider">Guru Nonaktif</span>
          <div className="text-3xl font-black text-[#1E1E1E] mt-1">{nonActiveCount}</div>
        </div>
      </div>

      {/* Success State Screen for Created Teacher */}
      {createdTeacherInfo && (
        <div className="mb-8 bg-white rounded-2xl neo-border neo-shadow p-8 text-center space-y-6" id="teacher-created-success-card">
          <div className="w-16 h-16 rounded-full bg-[#C1F2D0] neo-border flex items-center justify-center text-3xl mx-auto">
            🎉
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-gray-900 uppercase font-display">GURU BERHASIL DITAMBAHKAN! 🎉</h2>
            <p className="text-xs font-bold text-gray-500">Akun pengajar baru terdaftar aman pada Supabase Auth & Profiles.</p>
          </div>

          <div className="max-w-md mx-auto p-4 bg-[#FAF6F0] rounded-xl neo-border-thin text-left space-y-2">
            <div className="flex justify-between border-b border-gray-200 pb-1.5">
              <span className="text-xs font-black text-gray-400">NAMA LENGKAP</span>
              <span className="text-xs font-black text-gray-900">{createdTeacherInfo.nama_lengkap}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-1.5">
              <span className="text-xs font-black text-gray-400">USERNAME</span>
              <span className="text-xs font-black text-gray-900">@{createdTeacherInfo.username}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-1.5">
              <span className="text-xs font-black text-gray-400">EMAIL</span>
              <span className="text-xs font-black text-gray-900">{createdTeacherInfo.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-black text-gray-400">STATUS AKSES</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#C1F2D0] text-gray-900 uppercase">
                {createdTeacherInfo.status}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setCreatedTeacherInfo(null);
              setShowCreateForm(false);
              fetchTeachers();
            }}
            className="px-8 py-3.5 bg-[#C1F2D0] text-[#1E1E1E] neo-border rounded-xl font-black text-xs uppercase cursor-pointer"
          >
            SELESAI
          </button>
        </div>
      )}

      {/* Create Guru Modal/Collapse Form */}
      {showCreateForm && !createdTeacherInfo && (
        <div className="mb-8 bg-white rounded-2xl neo-border neo-shadow-sm p-6 animate-fadeIn" id="add-guru-form-panel">
          <h3 className="text-lg font-black text-gray-900 font-display mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#FF8B7B]" /> BUAT AKUN GURU
          </h3>

          {createError && (
            <div className="mb-4 p-3.5 bg-[#FF8B7B] neo-border text-xs font-black rounded-lg text-gray-900 uppercase tracking-wider">
              ⚠️ {createError}
            </div>
          )}

          <form onSubmit={handleCreateTeacher} className="space-y-4" id="create-guru-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1">Username (Unik) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: budi_smk"
                  className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold animate-pulseFocus"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1">Email Sekolah *</label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: budi@sekolah.id"
                  className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1">Password Awal *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-3 pr-10 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-800"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1">Nama Sekolah *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMK Multi Karya"
                  className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                  value={sekolah}
                  onChange={(e) => setSekolah(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1">Mata Pelajaran *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika"
                  className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                  value={mataPelajaran}
                  onChange={(e) => setMataPelajaran(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1">Kelas Tingkat *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: X atau XI, XII"
                  className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-100 rounded-lg neo-border-thin text-xs font-black cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-5 py-2.5 bg-[#C1F2D0] rounded-lg neo-border text-xs font-black cursor-pointer tracking-wider uppercase"
              >
                {createLoading ? 'CREATING TEACHER ACCOUNT...' : 'BUAT AKUN GURU →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Table Panel */}
      <div className="bg-white rounded-2xl neo-border neo-shadow p-5" id="admin-table-panel">
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-5" id="admin-filters">
          <div className="relative w-full sm:max-w-md" id="search-box">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-[#FAF6F0] neo-border-thin rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#FF8B7B]"
              placeholder="Cari nama, email, username, sekolah, mapel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0" id="filter-buttons">
            {(['all', 'aktif', 'nonaktif'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-xs font-black rounded-xl neo-border-thin cursor-pointer uppercase whitespace-nowrap ${
                  statusFilter === status ? 'bg-[#B4D3FF]' : 'bg-[#FAF6F0]'
                }`}
              >
                {status === 'all' ? 'Semua' : status}
              </button>
            ))}
            
            <button
              onClick={fetchTeachers}
              className="p-2.5 bg-[#FAF6F0] neo-border-thin rounded-xl cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Teacher list table */}
        <div className="overflow-x-auto" id="admin-table-wrapper">
          {loading ? (
            <div className="p-12 text-center" id="admin-loader">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Mengambil data guru...</span>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-bold text-xs uppercase tracking-wide">
              Tidak ada data guru yang cocok dengan kriteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-bold text-gray-800" id="guru-table">
              <thead>
                <tr className="border-b-[3.5px] border-gray-900 bg-[#B4D3FF]">
                  <th className="p-3.5">PROFIL GURU</th>
                  <th className="p-3.5">SEKOLAH</th>
                  <th className="p-3.5">MATA PELAJARAN</th>
                  <th className="p-3.5">KELAS</th>
                  <th className="p-3.5 text-center">STATUS</th>
                  <th className="p-3.5 text-right">AKSI ADMINISTRASI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#FAF6F0] neo-border-thin flex items-center justify-center text-xl">
                        {teacher.avatar_url || '👩‍🏫'}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-gray-900">{teacher.nama_lengkap}</div>
                        <div className="text-[10px] text-gray-400">@{teacher.username} • {teacher.email}</div>
                      </div>
                    </td>
                    <td className="p-3.5 text-gray-700">{teacher.sekolah || '-'}</td>
                    <td className="p-3.5 text-gray-700">{teacher.mata_pelajaran || '-'}</td>
                    <td className="p-3.5 text-gray-700">{teacher.kelas || '-'}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full neo-border-thin text-[10px] font-black uppercase text-gray-900 ${
                        teacher.status === 'aktif' ? 'bg-[#C1F2D0]' : 'bg-[#FF8B7B]'
                      }`}>
                        {teacher.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex justify-end gap-1.5">
                        {/* VIEW */}
                        <button
                          onClick={() => setViewingTeacher(teacher)}
                          className="p-1.5 bg-sky-100 text-sky-900 rounded-lg neo-border-thin cursor-pointer hover:bg-sky-200"
                          title="Lihat Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* EDIT */}
                        <button
                          onClick={() => {
                            setEditingTeacher(teacher);
                            setEditNamaLengkap(teacher.nama_lengkap);
                            setEditUsername(teacher.username);
                            setEditSekolah(teacher.sekolah || '');
                            setEditMataPelajaran(teacher.mata_pelajaran || '');
                            setEditKelas(teacher.kelas || '');
                            setEditStatus(teacher.status as 'aktif' | 'nonaktif');
                            setEditError('');
                          }}
                          className="p-1.5 bg-amber-100 text-amber-900 rounded-lg neo-border-thin cursor-pointer hover:bg-amber-200"
                          title="Ubah Profil"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* RESET PASSWORD */}
                        <button
                          onClick={() => setResettingTeacher(teacher)}
                          className="p-1.5 bg-purple-100 text-purple-900 rounded-lg neo-border-thin cursor-pointer hover:bg-purple-200"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        {/* DISABLE TOGGLE */}
                        <button
                          onClick={() => toggleTeacherStatus(teacher)}
                          className={`p-1.5 rounded-lg neo-border-thin cursor-pointer ${
                            teacher.status === 'aktif'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                          title={teacher.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {teacher.status === 'aktif' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>

                        {/* DELETE */}
                        <button
                          onClick={() => {
                            setDeletingTeacher(teacher);
                            setDeleteError('');
                          }}
                          className="p-1.5 bg-rose-100 text-rose-900 rounded-lg neo-border-thin cursor-pointer hover:bg-rose-200"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ------------------------------------ MODALS ------------------------------------ */}

      {/* VIEW MODAL */}
      {viewingTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-2xl neo-border neo-shadow-lg p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b-[3px] border-gray-900 pb-3">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider font-display">DETAIL AKUN GURU</h3>
              <button 
                onClick={() => setViewingTeacher(null)}
                className="p-1 hover:bg-gray-100 rounded-lg neo-border-thin"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 py-2 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-[#FAF6F0] neo-border flex items-center justify-center text-3xl">
                {viewingTeacher.avatar_url || '👩‍🏫'}
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900 leading-tight">{viewingTeacher.nama_lengkap}</h4>
                <p className="text-xs font-bold text-gray-400">@{viewingTeacher.username}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs font-bold text-gray-700">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">EMAIL</span>
                <span className="text-gray-900 font-extrabold">{viewingTeacher.email || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">NAMA SEKOLAH</span>
                <span className="text-gray-900 font-extrabold">{viewingTeacher.sekolah || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">MATA PELAJARAN</span>
                <span className="text-gray-900 font-extrabold">{viewingTeacher.mata_pelajaran || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">TINGKAT KELAS</span>
                <span className="text-gray-900 font-extrabold">{viewingTeacher.kelas || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">HAK AKSES / ROLE</span>
                <span className="text-gray-900 font-black uppercase text-blue-600">{viewingTeacher.role || 'guru'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">STATUS AKUN</span>
                <span className={`px-2 py-0.5 rounded-full neo-border-thin text-[10px] font-black uppercase ${
                  viewingTeacher.status === 'aktif' ? 'bg-[#C1F2D0]' : 'bg-[#FF8B7B]'
                }`}>
                  {viewingTeacher.status || 'aktif'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">TANGGAL TERDAFTAR</span>
                <span className="text-gray-900">
                  {viewingTeacher.created_at ? new Date(viewingTeacher.created_at).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : '-'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setViewingTeacher(null)}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase hover:bg-gray-800 neo-border"
            >
              TUTUP
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-2xl neo-border neo-shadow-lg p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b-[3px] border-gray-900 pb-3">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider font-display">EDIT DATA GURU</h3>
              <button 
                onClick={() => setEditingTeacher(null)}
                className="p-1 hover:bg-gray-100 rounded-lg neo-border-thin"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-[#FF8B7B] neo-border text-xs font-black rounded-lg text-gray-900 uppercase">
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleEditTeacherSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                  value={editNamaLengkap}
                  onChange={(e) => setEditNamaLengkap(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Username (Unik)</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                  value={editSekolah}
                  onChange={(e) => setEditSekolah(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                    value={editMataPelajaran}
                    onChange={(e) => setEditMataPelajaran(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Tingkat Kelas</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                    value={editKelas}
                    onChange={(e) => setEditKelas(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Status Keaktifan</label>
                <select
                  className="w-full px-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-lg text-xs font-bold"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'aktif' | 'nonaktif')}
                >
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 bg-gray-100 rounded-lg neo-border-thin text-xs font-black cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 bg-[#C1F2D0] rounded-lg neo-border text-xs font-black uppercase tracking-wider"
                >
                  {editLoading ? 'SIMPAN...' : 'SIMPAN PERUBAHAN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-white rounded-2xl neo-border neo-shadow-lg p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-[#FF8B7B]">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <h3 className="text-base font-black text-gray-900 uppercase font-display leading-tight">HAPUS AKUN GURU?</h3>
            </div>

            <p className="text-xs font-bold text-gray-600 leading-relaxed">
              Semua data akun yang terkait dengan <span className="text-gray-900 font-extrabold">{deletingTeacher.nama_lengkap}</span> akan ikut dihapus secara permanen dari Supabase Auth dan basis data profil sesuai kebijakan aplikasi.
            </p>

            {deleteError && (
              <div className="p-3 bg-[#FF8B7B] neo-border-thin text-[10px] font-black rounded-lg text-gray-900 uppercase">
                ⚠️ {deleteError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeletingTeacher(null)}
                className="px-4 py-2 bg-gray-100 rounded-lg neo-border-thin text-xs font-black cursor-pointer"
                disabled={deleteLoading}
              >
                BATAL
              </button>
              <button
                onClick={handleDeleteTeacherSubmit}
                disabled={deleteLoading}
                className="px-5 py-2.5 bg-[#FF8B7B] text-gray-900 rounded-lg neo-border text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                {deleteLoading ? 'MENGHAPUS...' : 'HAPUS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-white rounded-2xl neo-border neo-shadow-lg p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-2.5 text-purple-600">
              <Key className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-gray-900 uppercase font-display leading-tight">RESET PASSWORD</h3>
            </div>

            <p className="text-xs font-bold text-gray-600 leading-relaxed">
              Tindakan reset password mandiri dapat dilakukan dengan aman melalui konsol manajemen Supabase Auth Anda, atau guru dapat melakukan reset mandiri menggunakan email tautan reset yang telah disiapkan pada sistem otentikasi Supabase.
            </p>

            <button
              onClick={() => setResettingTeacher(null)}
              className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-black text-xs uppercase hover:bg-gray-800 neo-border cursor-pointer"
            >
              PAHAM, SELESAI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
