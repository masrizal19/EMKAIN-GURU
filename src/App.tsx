/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { HeaderSettings, AppScreen, Difficulty, QuestionType, GeneratedSet, RecentWork, UserProfile } from './types';
import { INITIAL_RECENT_WORKS, SAMPLE_QUESTION_SETS, generateQuestions } from './data';
import { getApiUrl } from './lib/api';
import { isProductionStaticBuild, updatePresenceDirect } from './lib/supabase_store';

// Import Screens
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import GenerateSoalScreen from './components/GenerateSoalScreen';
import QuestionsReadyScreen from './components/QuestionsReadyScreen';
import MateriScreen from './components/MateriScreen';
import RpmScreen from './components/RpmScreen';
import UjianScreen from './components/UjianScreen';
import ProfileScreen from './components/ProfileScreen';
import CommunityScreen from './components/CommunityScreen';
import ChatScreen from './components/ChatScreen';
import AdminPanel from './components/AdminPanel';
import AiCookingModal from './components/AiCookingModal';

// Icons
import {
  Sparkles,
  LayoutGrid,
  BookOpen,
  FileCheck2,
  Pencil,
  FolderOpen,
  History,
  Settings,
  LogOut,
  User,
  Users,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  // Authentication & Session state
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [headerSettings, setHeaderSettings] = useState<HeaderSettings | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

  // Routing & Workspace state
  const [screen, setScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [adminSubAction, setAdminSubAction] = useState<'list' | 'create' | 'edit' | 'delete'>('list');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSet, setGeneratedSet] = useState<GeneratedSet | null>(null);
  const [recentWorks, setRecentWorks] = useState<RecentWork[]>(INITIAL_RECENT_WORKS);

  // Chat & Presence State
  const [activeChatTargetUser, setActiveChatTargetUser] = useState<UserProfile | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  const fetchHeaderSettings = async () => {
    try {
      if (!isSupabaseConfigured) return;
      const { data, error } = await supabase
        .from('header_settings')
        .select('*')
        .eq('config_key', 'main')
        .maybeSingle();

      if (!error && data) {
        setHeaderSettings(data);
      }
    } catch (err) {
      console.error('Error fetching header settings:', err);
    }
  };

  useEffect(() => {
    fetchHeaderSettings();
    window.addEventListener('headerSettingsUpdated', fetchHeaderSettings);
    return () => {
      window.removeEventListener('headerSettingsUpdated', fetchHeaderSettings);
    };
  }, []);

  // Form parameters saved when submitting
  const [pendingGenParams, setPendingGenParams] = useState<{
    subject: string;
    grade: string;
    topic: string;
    difficulty: Difficulty;
    questionType: QuestionType;
    quantity: number;
  } | null>(null);

  // 1. Fetch user profiles safely
  const renderStatusIndicator = () => {
    const color = supabaseConnected === null ? '#FFD166' : (supabaseConnected ? '#22C55E' : '#EF4444');
    const label = supabaseConnected === null ? 'CONNECTING...' : (supabaseConnected ? 'CONNECTED' : 'DISCONNECTED');
    
    return (
      <div 
        className="fixed bottom-20 md:bottom-4 right-4 z-50 p-2.5 rounded-full bg-white border-2 border-gray-900 shadow-[2px_2px_0_rgba(0,0,0,1)] hover:scale-115 active:scale-95 transition-transform cursor-pointer flex items-center justify-center group"
        id="supabase-dev-status-indicator"
        title={label}
      >
        <span 
          className={`w-3 h-3 rounded-full block border border-gray-900 ${supabaseConnected === null || supabaseConnected ? 'animate-pulse' : ''}`} 
          style={{ backgroundColor: color }} 
        />
        {/* Hover/Touch Tooltip */}
        <span className="absolute bottom-11 right-0 hidden group-hover:block bg-gray-900 text-[#FAF6F0] text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded border-2 border-gray-900 whitespace-nowrap pointer-events-none shadow-[2px_2px_0_rgba(255,255,255,1)]">
          {label}
        </span>
      </div>
    );
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Fetch active session's user to inspect their email
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const userEmail = (currentSession?.user?.email || '').toLowerCase().trim();
      const isOfficialAdmin = userEmail === 'admin@gmail.com';

      if (error || !data) {
        console.warn('Profile not found for authenticated user, ensuring role profile created...');

        if (isOfficialAdmin) {
          const adminProf: UserProfile = {
            id: userId,
            username: 'admin',
            nama_lengkap: 'Administrator EMKAIN',
            email: 'admin@gmail.com',
            sekolah: 'EMKAIN Pusat',
            mata_pelajaran: 'Management',
            kelas: 'All',
            avatar_url: '👨‍💼',
            role: 'admin',
            status: 'aktif'
          };

          const { error: upsertErr } = await supabase
            .from('profiles')
            .upsert(adminProf, { onConflict: 'id' });

          if (!upsertErr) {
            setProfile(adminProf);
            return adminProf;
          }
        } else {
          // Standard Guru Profile Auto-Init if missing
          const defaultUsername = (userEmail.split('@')[0] || `guru_${userId.substring(0, 5)}`).replace(/[^a-zA-Z0-9_]/g, '_');
          const guruProf: UserProfile = {
            id: userId,
            username: defaultUsername,
            nama_lengkap: currentSession?.user?.user_metadata?.nama_lengkap || defaultUsername,
            email: userEmail,
            sekolah: '',
            mata_pelajaran: '',
            kelas: '',
            avatar_url: '👩‍🏫',
            role: 'guru', // STRICT MANDATE: All non-admin accounts are 'guru'
            status: 'aktif'
          };

          const { error: upsertErr } = await supabase
            .from('profiles')
            .upsert(guruProf, { onConflict: 'id' });

          if (!upsertErr) {
            setProfile(guruProf);
            return guruProf;
          }
        }

        setProfile(null);
        return null;
      } else {
        let userProf = data as UserProfile;
        
        // STRICT ENFORCEMENT: ONLY admin@gmail.com is admin
        if (isOfficialAdmin) {
          if (userProf.role !== 'admin' || userProf.status !== 'aktif') {
            await supabase.from('profiles').update({ role: 'admin', status: 'aktif' }).eq('id', userId);
            userProf.role = 'admin';
            userProf.status = 'aktif';
          }
        } else {
          // Non-admin account: MUST ALWAYS be 'guru'
          if (userProf.role === 'admin') {
            await supabase.from('profiles').update({ role: 'guru' }).eq('id', userId);
            userProf.role = 'guru';
          }
        }

        setProfile(userProf);
        return userProf;
      }
    } catch (err) {
      console.error('Failed to retrieve user profile:', err);
      return null;
    }
  };

  // 2. React to Hash changes & enforce authorization gates
  const handleHashRouting = (currentProfile: UserProfile | null, currentSession: any) => {
    const hash = window.location.hash;

    // A. Unauthenticated Area
    if (!currentSession) {
      if (hash === '#/register') {
        setScreen(AppScreen.REGISTER);
        return;
      }
      window.location.hash = '#/login';
      setScreen(AppScreen.LOGIN);
      return;
    }

    // B. Guard Account Status (nonaktif)
    if (currentProfile && currentProfile.status === 'nonaktif') {
      setScreen(AppScreen.DISABLED);
      return;
    }

    // C. Route mapping
    if (hash === '#/login' || hash === '' || hash === '#/') {
      window.location.hash = '#/dashboard';
      setScreen(AppScreen.DASHBOARD);
    } else if (hash === '#/dashboard') {
      setScreen(AppScreen.DASHBOARD);
    } else if (hash === '#/generate-soal') {
      setScreen(AppScreen.GENERATE_SOAL);
    } else if (hash === '#/questions-ready') {
      setScreen(AppScreen.QUESTIONS_READY);
    } else if (hash === '#/materi') {
      setScreen(AppScreen.MATERI);
    } else if (hash === '#/rpm') {
      setScreen(AppScreen.RPM);
    } else if (hash === '#/ujian') {
      setScreen(AppScreen.UJIAN);
    } else if (hash === '#/forum' || hash === '#/community') {
      setScreen(AppScreen.COMMUNITY);
    } else if (hash === '#/lounge' || hash === '#/chat') {
      setScreen(AppScreen.CHAT);
    } else if (hash === '#/profile') {
      setScreen(AppScreen.PROFILE);
    } else if (hash === '#/admin' || hash.startsWith('#/admin')) {
      // Role-Based Access Control: only 'admin' role allowed
      if (currentProfile && currentProfile.role === 'admin') {
        if (hash.includes('tambah-guru')) {
          setAdminSubAction('create');
        } else if (hash.includes('edit-guru')) {
          setAdminSubAction('edit');
        } else if (hash.includes('hapus-guru')) {
          setAdminSubAction('delete');
        } else {
          setAdminSubAction('list');
        }
        setScreen(AppScreen.ADMIN_DASHBOARD);
      } else if (currentProfile) {
        setScreen(AppScreen.ACCESS_DENIED);
      } else {
        setScreen(AppScreen.DASHBOARD);
      }
    } else {
      // Default fallback
      window.location.hash = '#/dashboard';
      setScreen(AppScreen.DASHBOARD);
    }
  };

  // 2.5 Supabase Connection Testing
  useEffect(() => {
    const testConnection = async () => {
      try {
        if (!isSupabaseConfigured) {
          setSupabaseConnected(false);
          return;
        }
        await supabase.auth.getSession();
        setSupabaseConnected(true);
      } catch (err) {
        console.error('Supabase connection test failed:', err);
        setSupabaseConnected(false);
      }
    };
    testConnection();
  }, []);

  // 3. Setup Auth State Listeners
  useEffect(() => {
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        // Safety timeout to guarantee initial render never hangs indefinitely
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
          setTimeout(() => resolve({ data: { session: null } }), 4000)
        );

        const { data: { session: activeSession } } = await Promise.race([sessionPromise, timeoutPromise]);
        setSession(activeSession);

        if (activeSession?.user) {
          const prof = await fetchUserProfile(activeSession.user.id);
          try {
            await updatePresenceDirect(activeSession.user.id, true);
          } catch (e) {
            // ignore
          }
          handleHashRouting(prof, activeSession);
        } else {
          setProfile(null);
          handleHashRouting(null, null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setSession(null);
        setProfile(null);
        handleHashRouting(null, null);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const prof = await fetchUserProfile(newSession.user.id);
        await updatePresenceDirect(newSession.user.id, true);
        handleHashRouting(prof, newSession);
      } else {
        setProfile(null);
        handleHashRouting(null, null);
      }
    });

    authSubscription = subscription;

    // Listen to Hash changes
    const handleHashChange = () => {
      handleHashRouting(profile, session);
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [profile?.id, session?.user?.id]);

  // Presence Heartbeat & Unread Chat Counter Loop
  useEffect(() => {
    if (!session?.user) return;

    const pingHeartbeat = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!s?.user?.id) return;

        // 1. Direct update to Supabase (Unified status/last_seen for both Dev & Production)
        await supabase
          .from('profiles')
          .update({
            online_status: true,
            last_seen: new Date().toISOString()
          })
          .eq('id', s.user.id);

        // 2. Local backend update (if in dev/local mode with Express)
        if (!isProductionStaticBuild() && s?.access_token) {
          await fetch(getApiUrl('/api/community/heartbeat'), {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${s.access_token}` }
          });
        }
      } catch (err) {
        // silent
      }
    };

    const fetchUnreadCount = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!s?.user?.id) return;

        if (isProductionStaticBuild()) {
          const { data: messages } = await supabase
            .from('messages')
            .select('sender_id, read_by')
            .not('sender_id', 'eq', s.user.id);

          const count = (messages || []).filter(
            m => !m.read_by || !m.read_by.includes(s.user.id)
          ).length;

          setUnreadChatCount(count);
          return;
        }

        if (s?.access_token) {
          const res = await fetch(getApiUrl('/api/chat/unread-count'), {
            headers: { 'Authorization': `Bearer ${s.access_token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && typeof data.unread_count === 'number') {
              setUnreadChatCount(data.unread_count);
            }
          }
        }
      } catch (err) {
        // silent
      }
    };

    // Immediate initial call
    pingHeartbeat();
    fetchUnreadCount();

    // Heartbeat every 25s, unread count every 10s
    const hbInterval = setInterval(pingHeartbeat, 25000);
    const unreadInterval = setInterval(fetchUnreadCount, 10000);

    return () => {
      clearInterval(hbInterval);
      clearInterval(unreadInterval);
    };
  }, [session?.user?.id]);

  // Handle successful login
  const handleLoginSuccess = async (userId: string) => {
    const prof = await fetchUserProfile(userId);
    window.location.hash = '#/dashboard';
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user?.id) {
        // Direct update to Supabase to mark user as OFFLINE
        await supabase
          .from('profiles')
          .update({
            online_status: false,
            last_seen: new Date().toISOString()
          })
          .eq('id', s.user.id);
      }

      if (!isProductionStaticBuild() && s?.access_token) {
        await fetch(getApiUrl('/api/community/presence-offline'), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${s.access_token}` }
        });
      }
    } catch (e) {
      // ignore
    }
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setGeneratedSet(null);
    setActiveChatTargetUser(null);
    setUnreadChatCount(0);
    window.location.hash = '#/login';
  };

  const handleNavigateToGenerate = () => {
    window.location.hash = '#/generate-soal';
  };

  const handleBackToDashboard = () => {
    window.location.hash = '#/dashboard';
  };

  const handleStartGenerating = (params: {
    subject: string;
    grade: string;
    topic: string;
    difficulty: Difficulty;
    questionType: QuestionType;
    quantity: number;
  }) => {
    setPendingGenParams(params);
    setIsGenerating(true);
  };

  const handleFinishCooking = () => {
    setIsGenerating(false);
    if (!pendingGenParams) return;

    // Call generator helper
    const newSet = generateQuestions(pendingGenParams);
    setGeneratedSet(newSet);
    window.location.hash = '#/questions-ready';

    // Save to local list
    const newRecentWork: RecentWork = {
      id: newSet.id,
      title: `Ujian ${newSet.subject} Kelas ${newSet.grade}`,
      date: `Generated on ${newSet.createdAt}`,
      status: 'READY',
      type: 'SOAL',
      subject: newSet.subject,
      grade: newSet.grade
    };

    setRecentWorks((prev) => {
      const filtered = prev.filter((w) => w.id !== newRecentWork.id);
      return [newRecentWork, ...filtered];
    });
    setPendingGenParams(null);
  };

  const handleLoadRecentWork = (workId: string) => {
    if (workId === 'rw-1') {
      const mathSet: GeneratedSet = {
        id: 'rw-1',
        subject: 'Matematika',
        grade: 'X',
        topic: 'Persamaan Linear dan Logika Kuadrat',
        difficulty: Difficulty.MEDIUM,
        questionType: QuestionType.MULTIPLE_CHOICE,
        quantity: 5,
        questions: SAMPLE_QUESTION_SETS['Matematika-X'],
        createdAt: '12 Okt 2025'
      };
      setGeneratedSet(mathSet);
      window.location.hash = '#/questions-ready';
    } else {
      const matchedSet = recentWorks.find((w) => w.id === workId);
      if (matchedSet) {
        const defaultSet: GeneratedSet = {
          id: matchedSet.id,
          subject: matchedSet.subject || 'Matematika',
          grade: matchedSet.grade || 'X',
          topic: 'Hasil Generate Sebelumnya',
          difficulty: Difficulty.MEDIUM,
          questionType: QuestionType.MULTIPLE_CHOICE,
          quantity: 5,
          questions: SAMPLE_QUESTION_SETS[`${matchedSet.subject}-${matchedSet.grade}`] || SAMPLE_QUESTION_SETS['Matematika-X'],
          createdAt: matchedSet.date
        };
        setGeneratedSet(defaultSet);
        window.location.hash = '#/questions-ready';
      }
    }
  };

  const handleSaveToRecentManual = () => {
    if (!generatedSet) return;
    alert('Soal Anda berhasil disimpan ke riwayat dan Bank Soal!');
  };

  // Loading Screen when authenticating on boot
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#B4D3FF] neo-grid-bg flex items-center justify-center font-body" id="boot-loader">
        <div className="bg-white rounded-2xl neo-border neo-shadow p-8 text-center max-w-sm">
          <div className="text-4xl animate-bounce mb-4">🌟</div>
          <h2 className="text-lg font-black uppercase text-gray-900 font-display">MENYINKRONKAN SESI...</h2>
          <p className="text-xs font-bold text-gray-400 mt-1">Harap tunggu sementara EMKAIN memuat data.</p>
        </div>
        {renderStatusIndicator()}
      </div>
    );
  }

  // A. BANNED/DISABLED ACCOUNT VIEW
  if (screen === AppScreen.DISABLED) {
    return (
      <div className="min-h-screen bg-[#FF8B7B] neo-grid-bg py-8 px-4 flex items-center justify-center font-body" id="disabled-screen">
        <div className="w-full max-w-md bg-white rounded-2xl neo-border neo-shadow-lg p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#FF8B7B] neo-border flex items-center justify-center text-3xl mx-auto">
            <AlertTriangle className="w-8 h-8 text-gray-900" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900 font-display uppercase">AKSES DIALANG</h1>
            <p className="text-xs font-bold text-[#FF8B7B] tracking-wider uppercase">ACCOUNT DISABLED</p>
            <p className="text-sm font-medium text-gray-600 leading-relaxed">
              Maaf, akun Anda telah dinonaktifkan oleh administrator sekolah. Silakan hubungi admin sekolah Anda untuk mengaktifkan kembali akses Anda.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-3.5 bg-[#B4D3FF] text-gray-900 neo-border rounded-xl font-black text-xs uppercase cursor-pointer"
          >
            LOGOUT / KELUAR SESI
          </button>
        </div>
        {renderStatusIndicator()}
      </div>
    );
  }

  // B. ACCESS DENIED VIEW (Guru tries to enter #/admin)
  if (screen === AppScreen.ACCESS_DENIED) {
    return (
      <div className="min-h-screen bg-[#FF8B7B] neo-grid-bg py-8 px-4 flex items-center justify-center font-body" id="access-denied-screen">
        <div className="w-full max-w-md bg-white rounded-2xl neo-border neo-shadow-lg p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#FFD166] neo-border flex items-center justify-center text-3xl mx-auto">
            <AlertTriangle className="w-8 h-8 text-gray-900" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900 font-display uppercase">AKSES DITOLAK</h1>
            <p className="text-xs font-bold text-amber-500 tracking-wider uppercase">ACCESS DENIED</p>
            <p className="text-sm font-medium text-gray-600 leading-relaxed">
              Halaman ini hanya ditujukan khusus untuk Administrator Sekolah. Akun guru Anda tidak memiliki kredensial untuk membuka fitur ini.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                window.location.hash = '#/dashboard';
                setScreen(AppScreen.DASHBOARD);
              }}
              className="w-full py-3.5 bg-[#C1F2D0] text-gray-900 neo-border rounded-xl font-black text-xs uppercase cursor-pointer"
            >
              KEMBALI KE DASHBOARD
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3.5 bg-gray-100 text-gray-600 neo-border-thin rounded-xl font-bold text-xs uppercase cursor-pointer"
            >
              LOGOUT / KELUAR SESI
            </button>
          </div>
        </div>
        {renderStatusIndicator()}
      </div>
    );
  }

  // C. UNAUTHENTICATED GATES: LOGIN & REGISTER
  if (!session) {
    if (screen === AppScreen.REGISTER) {
      return (
        <div className="min-h-screen bg-[#B4D3FF] neo-grid-bg py-8 px-4 flex items-center justify-center font-body" id="register-screen-wrapper">
          <div className="w-full max-w-md bg-white rounded-2xl neo-border neo-shadow-lg p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#FFD166] neo-border flex items-center justify-center text-3xl mx-auto">
              🛡️
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900 font-display uppercase leading-tight">AKUN EMKAIN DIBUAT OLEH ADMIN</h1>
              <p className="text-sm font-medium text-gray-600 leading-relaxed">
                Jika Anda guru dan belum memiliki akun, silakan hubungi administrator EMKAIN.
              </p>
            </div>
            <button
              onClick={() => {
                window.location.hash = '#/login';
                setScreen(AppScreen.LOGIN);
              }}
              className="w-full py-3.5 bg-[#FF8B7B] text-[#1E1E1E] neo-border rounded-xl font-black text-xs uppercase cursor-pointer"
            >
              KEMBALI KE LOGIN
            </button>
          </div>
          {renderStatusIndicator()}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#B4D3FF] neo-grid-bg py-8 px-4 flex items-center justify-center font-body" id="login-screen-wrapper">
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        {renderStatusIndicator()}
      </div>
    );
  }

  // C.5 PROFILE LOADING GATE FOR AUTHENTICATED USERS
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#B4D3FF] neo-grid-bg flex items-center justify-center font-body" id="profile-boot-loader">
        <div className="bg-white rounded-2xl neo-border neo-shadow p-8 text-center max-w-sm">
          <div className="text-4xl animate-bounce mb-4">👩‍🏫</div>
          <h2 className="text-lg font-black uppercase text-gray-900 font-display">MENYINKRONKAN PROFIL...</h2>
          <p className="text-xs font-bold text-gray-400 mt-1">Menyiapkan workspace pengajaran Anda.</p>
        </div>
        {renderStatusIndicator()}
      </div>
    );
  }

  // D. SHARED LAYOUT FOR AUTHENTICATED PORTALS (Dashboard, Generate Soal, Questions Ready, Profile, Community, Chat, Admin Panel)
  return (
    <div className="min-h-screen bg-[#B4D3FF] neo-grid-bg py-0 px-0 md:py-6 md:px-4 lg:px-8 flex items-center justify-center font-body" id="authenticated-workspace">
      <div 
        className="flex flex-col lg:flex-row w-full max-w-7xl bg-[#FAF6F0] rounded-none md:rounded-2xl border-0 md:border-2 border-gray-900 shadow-none md:shadow-lg overflow-hidden min-h-screen md:h-[90vh] md:max-h-[90vh]" 
        id="app-workspace-layout"
        style={headerSettings ? {
          '--tw-border-opacity': 1,
          borderColor: headerSettings.border_color,
        } as React.CSSProperties : undefined}
      >
        
        {/* MOBILE HEADER */}
        <header 
          className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30" 
          id="mobile-app-header"
          style={{ 
            backgroundColor: headerSettings?.bg_color || '#FAF6F0',
            borderBottom: `${headerSettings?.border_width || '2px'} solid ${headerSettings?.border_color || '#111827'}`,
            borderRadius: headerSettings?.border_radius && headerSettings.border_radius !== '0' ? `${headerSettings.border_radius} ${headerSettings.border_radius} 0 0` : undefined
          }}
        >
          <div className="flex items-center gap-2 flex-1">
            {(headerSettings ? headerSettings.show_logo : true) && (
              <div 
                className={`flex items-center justify-center overflow-hidden flex-shrink-0 ${
                  (headerSettings?.show_logo_circle ?? true)
                    ? 'w-9 h-9 rounded-full neo-border-thin'
                    : 'w-16 h-9 rounded-lg px-1'
                }`}
                style={{ backgroundColor: (headerSettings?.show_logo_circle ?? true) ? (headerSettings?.bg_color || '#FFD166') : 'transparent' }}
              >
                {headerSettings?.logo_url ? (
                  <img src={headerSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xl">👩‍🏫</span>
                )}
              </div>
            )}
            {((headerSettings?.show_brand_name ?? true) || (headerSettings?.show_subtitle ?? true)) && (
              <div className="hidden sm:block">
                {(headerSettings?.show_brand_name ?? true) && (
                  <h1 
                    className="text-sm font-black font-display leading-none"
                    style={{ color: headerSettings?.text_color || '#111827' }}
                  >
                    {headerSettings?.brand_name || 'EMKAIN GURU'}
                  </h1>
                )}
                {(headerSettings?.show_subtitle ?? true) && (
                  <span className="text-[8px] font-black uppercase tracking-widest block opacity-70 mt-0.5" style={{ color: headerSettings?.text_color || '#6B7280' }}>
                    {headerSettings?.brand_subtitle || 'Edu-Creative Portal'}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {headerSettings?.header_title && (headerSettings?.show_default_title ?? true) && (
            <div className="flex-1 text-center font-black text-sm tracking-wider uppercase font-display hidden xs:block truncate px-2" style={{ color: headerSettings.text_color || '#111827' }}>
              {headerSettings.header_title}
            </div>
          )}

          <div className="flex items-center gap-2 flex-1 justify-end">
            {profile?.role === 'admin' && (
              <button 
                onClick={() => { 
                  setAdminSubAction('list');
                  window.location.hash = '#/admin'; 
                }}
                className="p-1.5 bg-[#FFD166] neo-border-thin rounded-lg text-gray-900 cursor-pointer"
                title="Admin Panel"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 border border-red-200 transition-colors cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* SHARED STABLE SIDEBAR */}
        <aside 
          className="hidden lg:flex w-full lg:w-[280px] flex-col justify-between p-6 flex-shrink-0 overflow-y-auto" 
          id="app-workspace-sidebar"
          style={{ 
            backgroundColor: headerSettings?.bg_color || '#FAF6F0',
            borderRight: `${headerSettings?.border_width || '2px'} solid ${headerSettings?.border_color || '#111827'}`
          }}
        >
          <div>
            {/* Logo Brand Header */}
            <div className="flex items-center gap-3 mb-8" id="sidebar-brand-header">
              {(headerSettings ? headerSettings.show_logo : true) && (
                <div 
                  className={`flex items-center justify-center overflow-hidden flex-shrink-0 ${
                    (headerSettings?.show_logo_circle ?? true)
                      ? 'w-12 h-12 rounded-full neo-border-thin'
                      : 'w-20 h-12 rounded-xl px-1'
                  }`}
                  style={{ backgroundColor: (headerSettings?.show_logo_circle ?? true) ? (headerSettings?.bg_color || '#FFD166') : 'transparent' }}
                >
                  {headerSettings?.logo_url ? (
                    <img src={headerSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl">👩‍🏫</span>
                  )}
                </div>
              )}
              {((headerSettings?.show_brand_name ?? true) || (headerSettings?.show_subtitle ?? true)) && (
                <div>
                  {(headerSettings?.show_brand_name ?? true) && (
                    <h2 
                      className="text-lg font-black font-display tracking-tight leading-none"
                      style={{ color: headerSettings?.text_color || '#111827' }}
                    >
                      {headerSettings?.brand_name || 'EMKAIN GURU'}
                    </h2>
                  )}
                  {(headerSettings?.show_subtitle ?? true) && (
                    <span 
                      className="text-[10px] font-extrabold uppercase tracking-widest block mt-0.5 opacity-70"
                      style={{ color: headerSettings?.text_color || '#6B7280' }}
                    >
                      {headerSettings?.brand_subtitle || 'Edu-Creative Portal'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Teacher Greeting */}
            <div className="mb-6 p-4 bg-white rounded-xl neo-border-thin text-left space-y-1" id="sidebar-teacher-badge">
              <div className="text-[10px] font-black uppercase text-gray-400">GURU MASUK</div>
              <div className="font-extrabold text-xs text-gray-900 truncate">{profile?.nama_lengkap}</div>
              <span className="px-2 py-0.5 bg-[#B4D3FF] rounded-full neo-border-thin text-[8px] font-black uppercase text-gray-900">
                {profile?.role}
              </span>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5" id="sidebar-nav-links">
              {/* 1. Dashboard */}
              <button
                onClick={() => { window.location.hash = '#/dashboard'; }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  screen === AppScreen.DASHBOARD
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-border-thin neo-shadow-sm translate-x-0.5'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                id="nav-item-dashboard"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              {/* 2. Generate Soal */}
              <button
                onClick={() => { window.location.hash = '#/generate-soal'; }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  screen === AppScreen.GENERATE_SOAL || screen === AppScreen.QUESTIONS_READY
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-border-thin neo-shadow-sm translate-x-0.5'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                id="nav-item-generate-soal"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Soal</span>
              </button>

              {/* 3. Materi */}
              <button
                onClick={() => { window.location.hash = '#/materi'; }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  screen === AppScreen.MATERI
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-border-thin neo-shadow-sm translate-x-0.5'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                id="nav-item-materi"
              >
                <BookOpen className="w-4 h-4" />
                <span>Materi</span>
              </button>

              {/* 4. Ujian */}
              <button
                onClick={() => { window.location.hash = '#/ujian'; }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  screen === AppScreen.UJIAN
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-border-thin neo-shadow-sm translate-x-0.5'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                id="nav-item-ujian"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Ujian</span>
              </button>

              {/* 5. Forum */}
              <button
                onClick={() => { window.location.hash = '#/forum'; }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  screen === AppScreen.COMMUNITY
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-border-thin neo-shadow-sm translate-x-0.5'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                id="nav-item-forum"
              >
                <Users className="w-4 h-4" />
                <span>Forum</span>
              </button>

              {/* 6. Lounge */}
              <button
                onClick={() => { window.location.hash = '#/lounge'; }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  screen === AppScreen.CHAT
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-border-thin neo-shadow-sm translate-x-0.5'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                id="nav-item-lounge"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4" />
                  <span>Lounge</span>
                </div>
                {unreadChatCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[9px] font-black animate-pulse">
                    {unreadChatCount}
                  </span>
                )}
              </button>

              {/* 7. Profil */}
              <button
                onClick={() => { window.location.hash = '#/profile'; }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  screen === AppScreen.PROFILE
                    ? 'bg-[#FF8B7B] text-[#1E1E1E] neo-border-thin neo-shadow-sm translate-x-0.5'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                id="nav-item-profile"
              >
                <User className="w-4 h-4" />
                <span>Profil</span>
              </button>

              {/* 8. Admin Panel (HANYA UNTUK ROLE ADMIN) */}
              {profile?.role === 'admin' && (
                <div className="pt-2 space-y-1" id="nav-group-admin-panel">
                  <div className="px-2 py-1 text-[10px] font-black uppercase text-amber-700 tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Admin Panel</span>
                  </div>

                  {/* Main Admin Panel Dashboard */}
                  <button
                    onClick={() => { 
                      setAdminSubAction('list');
                      window.location.hash = '#/admin'; 
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                      screen === AppScreen.ADMIN_DASHBOARD && adminSubAction === 'list'
                        ? 'bg-[#FFD166] text-[#1E1E1E] neo-border-thin neo-shadow-sm translate-x-0.5'
                        : 'text-gray-700 hover:bg-yellow-50'
                    }`}
                    id="nav-item-admin-panel"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Admin Panel</span>
                  </button>

                  {/* Sub-item: Tambah Guru */}
                  <button
                    onClick={() => { 
                      setAdminSubAction('create');
                      window.location.hash = '#/admin-tambah-guru'; 
                    }}
                    className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition-all ${
                      screen === AppScreen.ADMIN_DASHBOARD && adminSubAction === 'create'
                        ? 'bg-[#FFD166] text-[#1E1E1E] font-black'
                        : 'text-gray-600 hover:bg-yellow-50'
                    }`}
                    id="nav-item-admin-tambah-guru"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tambah Guru</span>
                  </button>

                  {/* Sub-item: Edit Guru */}
                  <button
                    onClick={() => { 
                      setAdminSubAction('edit');
                      window.location.hash = '#/admin-edit-guru'; 
                    }}
                    className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition-all ${
                      screen === AppScreen.ADMIN_DASHBOARD && adminSubAction === 'edit'
                        ? 'bg-[#FFD166] text-[#1E1E1E] font-black'
                        : 'text-gray-600 hover:bg-yellow-50'
                    }`}
                    id="nav-item-admin-edit-guru"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Edit Guru</span>
                  </button>

                  {/* Sub-item: Hapus Guru */}
                  <button
                    onClick={() => { 
                      setAdminSubAction('delete');
                      window.location.hash = '#/admin-hapus-guru'; 
                    }}
                    className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition-all ${
                      screen === AppScreen.ADMIN_DASHBOARD && adminSubAction === 'delete'
                        ? 'bg-[#FFD166] text-[#1E1E1E] font-black'
                        : 'text-gray-600 hover:bg-yellow-50'
                    }`}
                    id="nav-item-admin-hapus-guru"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Hapus Guru</span>
                  </button>
                </div>
              )}
            </nav>
          </div>

          {/* Sidebar Footer Log out */}
          <div className="pt-6 border-t border-gray-200 space-y-2" id="sidebar-workspace-footer">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Sesi</span>
            </button>
          </div>
        </aside>

        {/* WORKSPACE CONTENT PANELS */}
        <main className="flex-1 neo-grid-bg p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto" id="app-workspace-content-pane">
          <div className="max-w-6xl mx-auto" id="workspace-sub-viewport">
            
            {screen === AppScreen.DASHBOARD && (
              <DashboardScreen
                onNavigateToGenerate={handleNavigateToGenerate}
                onNavigateToMateri={() => { window.location.hash = '#/materi'; }}
                onNavigateToUjian={() => { window.location.hash = '#/ujian'; }}
                onNavigateToRpm={() => { window.location.hash = '#/rpm'; }}
                onLoadRecentWork={handleLoadRecentWork}
                recentWorks={recentWorks}
                onLogout={handleLogout}
                activeMenu="dashboard"
                setActiveMenu={() => {}}
              />
            )}

            {screen === AppScreen.GENERATE_SOAL && (
              <GenerateSoalScreen
                onBackToDashboard={handleBackToDashboard}
                onStartGenerating={handleStartGenerating}
              />
            )}

            {screen === AppScreen.QUESTIONS_READY && generatedSet && (
              <QuestionsReadyScreen
                generatedSet={generatedSet}
                onBack={handleBackToDashboard}
                onSaveToRecent={handleSaveToRecentManual}
              />
            )}

            {screen === AppScreen.MATERI && profile && (
              <MateriScreen
                profile={profile}
                onBack={handleBackToDashboard}
              />
            )}

            {screen === AppScreen.RPM && profile && (
              <RpmScreen
                profile={profile}
                onBack={handleBackToDashboard}
              />
            )}

            {screen === AppScreen.UJIAN && profile && (
              <UjianScreen
                profile={profile}
                onBack={handleBackToDashboard}
                onNavigateToGenerate={handleNavigateToGenerate}
              />
            )}

            {screen === AppScreen.PROFILE && profile && (
              <ProfileScreen
                profile={profile}
                onBack={handleBackToDashboard}
                onProfileUpdated={(updated) => setProfile(updated)}
              />
            )}

            {screen === AppScreen.COMMUNITY && profile && (
              <CommunityScreen
                profile={profile}
                onBack={handleBackToDashboard}
                onStartChatWithUser={(targetUser) => {
                  setActiveChatTargetUser(targetUser);
                  window.location.hash = '#/lounge';
                }}
              />
            )}

            {screen === AppScreen.CHAT && profile && (
              <ChatScreen
                profile={profile}
                onBack={handleBackToDashboard}
                initialTargetUser={activeChatTargetUser}
              />
            )}

            {screen === AppScreen.ADMIN_DASHBOARD && (
              <AdminPanel
                onBack={handleBackToDashboard}
                initialAction={adminSubAction}
              />
            )}

          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION */}
        <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-[#FAF6F0] border-t-2 border-gray-900 px-2 py-2 flex justify-around items-center z-40 shadow-[0_-4px_0_rgba(0,0,0,1)]" id="mobile-app-bottom-nav">
          {/* 1. Dashboard */}
          <button 
            onClick={() => { window.location.hash = '#/dashboard'; }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
              screen === AppScreen.DASHBOARD 
                ? 'bg-[#FF8B7B] text-[#1E1E1E] border border-gray-900 shadow-[1px_1px_0_rgba(0,0,0,1)]' 
                : 'text-gray-600'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Dashboard</span>
          </button>

          {/* 2. Materi */}
          <button 
            onClick={() => { window.location.hash = '#/materi'; }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
              screen === AppScreen.MATERI 
                ? 'bg-[#FF8B7B] text-[#1E1E1E] border border-gray-900 shadow-[1px_1px_0_rgba(0,0,0,1)]' 
                : 'text-gray-600'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Materi</span>
          </button>

          {/* 3. Ujian */}
          <button 
            onClick={() => { window.location.hash = '#/ujian'; }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
              screen === AppScreen.UJIAN 
                ? 'bg-[#FF8B7B] text-[#1E1E1E] border border-gray-900 shadow-[1px_1px_0_rgba(0,0,0,1)]' 
                : 'text-gray-600'
            }`}
          >
            <FileCheck2 className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Ujian</span>
          </button>

          {/* 4. Forum */}
          <button 
            onClick={() => { window.location.hash = '#/forum'; }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
              screen === AppScreen.COMMUNITY 
                ? 'bg-[#FF8B7B] text-[#1E1E1E] border border-gray-900 shadow-[1px_1px_0_rgba(0,0,0,1)]' 
                : 'text-gray-600'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Forum</span>
          </button>

          {/* 5. Lounge / Chat */}
          <button 
            onClick={() => { window.location.hash = '#/lounge'; }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-all cursor-pointer relative ${
              screen === AppScreen.CHAT 
                ? 'bg-[#FF8B7B] text-[#1E1E1E] border border-gray-900 shadow-[1px_1px_0_rgba(0,0,0,1)]' 
                : 'text-gray-600'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Lounge</span>
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-red-500 text-white rounded-full text-[8px] font-black border border-white animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>
        </nav>

      </div>

      {/* AI Cooking Animation Overlay */}
      <AiCookingModal
        isOpen={isGenerating}
        onFinish={handleFinishCooking}
      />

      {renderStatusIndicator()}
    </div>
  );
}
