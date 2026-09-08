/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, Plus, Users, Play, Trophy, Copy, CheckCircle2, 
  Clock, Share2, Eye, RotateCcw, AlertTriangle, ArrowRight, ExternalLink
} from 'lucide-react';
import { UserProfile, GameRoom } from '../../types';
import { fetchGameRoomsApi } from '../../lib/game_store';
import { CreateGameModal } from './CreateGameModal';
import { TeacherGameRoom } from './TeacherGameRoom';
import { StudentGameJoin } from './StudentGameJoin';

interface GameCenterProps {
  profile: UserProfile;
  onBackToDashboard: () => void;
  initialRoomCode?: string;
  isStudentJoinView?: boolean;
}

export const GameCenter: React.FC<GameCenterProps> = ({
  profile,
  onBackToDashboard,
  initialRoomCode = '',
  isStudentJoinView = false
}) => {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Navigation states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTeacherRoomId, setActiveTeacherRoomId] = useState<string | null>(null);
  const [studentMode, setStudentMode] = useState<boolean>(isStudentJoinView || !!initialRoomCode);
  const [studentRoomCode, setStudentRoomCode] = useState<string>(initialRoomCode);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const creatorParam = profile.role === 'admin' ? undefined : profile.id;
      const res = await fetchGameRoomsApi(creatorParam);
      if (res.success && res.rooms) {
        setRooms(res.rooms);
      } else {
        setError(res.error || 'Gagal memuat daftar game');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRoomCode) {
      setStudentRoomCode(initialRoomCode);
      setStudentMode(true);
    }
  }, [initialRoomCode]);

  useEffect(() => {
    if (!studentMode && !activeTeacherRoomId) {
      loadRooms();
    }
  }, [studentMode, activeTeacherRoomId]);

  const handleCopyLink = (room: GameRoom) => {
    const url = `${window.location.origin}${window.location.pathname}#/game/join/${room.room_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(room.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // If viewing teacher room
  if (activeTeacherRoomId) {
    return (
      <TeacherGameRoom
        roomIdOrCode={activeTeacherRoomId}
        onBack={() => setActiveTeacherRoomId(null)}
        creatorId={profile.id}
      />
    );
  }

  // If student join view
  if (studentMode) {
    return (
      <StudentGameJoin
        initialRoomCode={studentRoomCode}
        onExit={() => {
          setStudentMode(false);
          setStudentRoomCode('');
          window.location.hash = '#/game';
        }}
        currentUserId={profile.id}
        currentUserName={profile.nama_lengkap}
      />
    );
  }

  const activeRoomsCount = rooms.filter(r => r.status === 'waiting' || r.status === 'playing').length;
  const finishedRoomsCount = rooms.filter(r => r.status === 'finished').length;

  return (
    <div className="space-y-6 font-body pb-12" id="game-center-container">
      
      {/* HEADER BANNER */}
      <div className="p-6 md:p-8 bg-[#FFD166] rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-900 text-xs font-black uppercase text-gray-900">
            <Gamepad2 className="w-4 h-4 text-purple-600" />
            <span>FITUR REALTIME QUIZ</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-gray-900 leading-none">
            GAME CENTER
          </h1>
          <p className="text-xs md:text-sm font-bold text-gray-800 max-w-xl leading-relaxed">
            Buat kuis realtime interaktif berkecepatan tinggi bergaya Kahoot/Quizizz untuk siswa Anda. Lengkap dengan sistem PIN, countdown timer, anti-cheat, dan leaderboard podium juara.
          </p>
        </div>

        {/* TOP BUTTON ACTIONS */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setStudentMode(true)}
            className="flex-1 md:flex-none py-3 px-5 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>GABUNG KUIS SISWA</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex-1 md:flex-none py-3 px-6 bg-[#C1F2D0] hover:bg-emerald-300 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>BUAT GAME BARU</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">TOTAL GAME DIBUAT</span>
            <span className="text-2xl font-black font-display text-gray-900 mt-0.5 block">{rooms.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#B4D3FF] border border-gray-900 flex items-center justify-center text-lg">
            📚
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">ROOM AKTIF / LOBBY</span>
            <span className="text-2xl font-black font-display text-emerald-600 mt-0.5 block">{activeRoomsCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#C1F2D0] border border-gray-900 flex items-center justify-center text-lg">
            ⚡
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">KUIS SELESAI</span>
            <span className="text-2xl font-black font-display text-amber-600 mt-0.5 block">{finishedRoomsCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FFD166] border border-gray-900 flex items-center justify-center text-lg">
            🏆
          </div>
        </div>
      </div>

      {/* GAME ROOMS LIST / HISTORY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-black font-display uppercase tracking-tight text-gray-900 flex items-center gap-2">
            <span>RIWAYAT & DAFTAR GAME KUIS</span>
            <span className="px-2.5 py-0.5 bg-[#FAF6F0] rounded-full border border-gray-900 text-xs font-mono font-black">
              {rooms.length}
            </span>
          </h2>
          <button
            onClick={loadRooms}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border-2 border-red-500 rounded-xl text-xs font-bold text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center space-y-2">
            <div className="text-3xl animate-bounce">🎮</div>
            <div className="text-xs font-black uppercase text-gray-500">Memuat game kuis...</div>
          </div>
        ) : rooms.length === 0 ? (
          /* EMPTY STATE */
          <div className="p-8 md:p-12 bg-white rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFD166] border-2 border-gray-900 flex items-center justify-center text-2xl mx-auto shadow-[2px_2px_0_rgba(0,0,0,1)]">
              🎮
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black uppercase text-gray-900 font-display">
                BELUM ADA GAME KUIS DIBUAT
              </h3>
              <p className="text-xs font-medium text-gray-600 max-w-md mx-auto">
                Anda belum membuat room game kuis. Klik tombol di bawah untuk membuat kuis baru dan bagikan PIN kepada siswa Anda.
              </p>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="py-3 px-6 bg-[#FFD166] hover:bg-yellow-300 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              + BUAT GAME KUIS PERTAMA ANDA
            </button>
          </div>
        ) : (
          /* ROOM CARDS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const statusBadges: Record<string, { bg: string; text: string; label: string }> = {
                waiting: { bg: 'bg-[#FFD166]', text: 'text-gray-900', label: 'LOBBY (SIAP)' },
                playing: { bg: 'bg-[#C1F2D0]', text: 'text-gray-900', label: 'SEDANG BERJALAN' },
                finished: { bg: 'bg-[#B4D3FF]', text: 'text-gray-900', label: 'SELESAI' },
                closed: { bg: 'bg-gray-200', text: 'text-gray-600', label: 'DITUTUP' }
              };
              const badge = statusBadges[room.status] || statusBadges.waiting;

              return (
                <div
                  key={room.id}
                  className="p-5 bg-white rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] flex flex-col justify-between space-y-4 hover:shadow-[5px_5px_0_rgba(0,0,0,1)] transition-all"
                >
                  <div className="space-y-2.5">
                    
                    {/* STATUS & DATE HEADER */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full border border-gray-900 text-[10px] font-black uppercase ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {room.created_at ? new Date(room.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </div>

                    {/* TITLE & SUBJECT */}
                    <div>
                      <h3 className="text-base font-black font-display uppercase tracking-tight text-gray-900 leading-snug line-clamp-2" title={room.title}>
                        {room.title}
                      </h3>
                      <p className="text-xs font-bold text-gray-600 mt-1">
                        {room.subject} • Kelas {room.class_level}
                      </p>
                    </div>

                    {/* METADATA CHIPS */}
                    <div className="p-3 bg-[#FAF6F0] rounded-xl border border-gray-900 flex items-center justify-between text-xs font-bold">
                      <div>
                        <span className="text-[9px] font-black uppercase text-gray-400 block">PIN GAME</span>
                        <span className="text-sm font-black font-mono text-gray-900 tracking-wider">
                          {room.pin}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-gray-400 block">KODE ROOM</span>
                        <span className="text-sm font-black font-mono text-blue-600 tracking-wider">
                          {room.room_code}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black uppercase text-gray-400 block">SOAL / WAKTU</span>
                        <span className="text-xs font-black text-gray-800">
                          {room.question_count} Q ({room.time_per_question}s)
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => setActiveTeacherRoomId(room.id)}
                      className="w-full py-2.5 px-4 bg-[#FFD166] hover:bg-yellow-300 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5 fill-gray-900" />
                      <span>{room.status === 'waiting' ? 'BUKA LOBBY GURU' : room.status === 'playing' ? 'LANJUTKAN LIVE ROOM' : 'LIHAT HASIL & RANKING'}</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyLink(room)}
                        className="flex-1 py-2 px-3 bg-white hover:bg-gray-100 border border-gray-900 rounded-lg text-xs font-bold text-gray-800 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {copiedId === room.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-black">LINK TERSALIN</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>SALIN LINK</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setStudentRoomCode(room.room_code);
                          setStudentMode(true);
                        }}
                        className="py-2 px-3 bg-gray-100 hover:bg-gray-200 border border-gray-900 rounded-lg text-xs font-bold text-gray-800 cursor-pointer flex items-center justify-center gap-1"
                        title="Masuk sebagai peserta uji coba"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>TEST SISWA</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE GAME MODAL */}
      <CreateGameModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        creatorId={profile.id}
        creatorName={profile.nama_lengkap}
        onGameCreated={(newRoom) => {
          setIsCreateOpen(false);
          setActiveTeacherRoomId(newRoom.id);
        }}
      />

    </div>
  );
};
