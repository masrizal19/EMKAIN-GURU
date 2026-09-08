/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, Plus, Users, Play, Trophy, Copy, CheckCircle2, 
  Clock, Share2, Eye, RotateCcw, AlertTriangle, ArrowRight, ExternalLink,
  Trash2, FileText, X
} from 'lucide-react';
import { UserProfile, GameRoom } from '../../types';
import { supabase } from '../../lib/supabase';
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
  const [notification, setNotification] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modals & Navigation states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTeacherRoomId, setActiveTeacherRoomId] = useState<string | null>(null);
  const [studentMode, setStudentMode] = useState<boolean>(isStudentJoinView || !!initialRoomCode);
  const [studentRoomCode, setStudentRoomCode] = useState<string>(initialRoomCode);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Detail Modal State (Section D: get_game_detail)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedGameDetail, setSelectedGameDetail] = useState<{
    game: GameRoom;
    questions: any[];
  } | null>(null);
  const [copiedDetailLink, setCopiedDetailLink] = useState(false);
  const [copiedDetailPin, setCopiedDetailPin] = useState(false);

  const loadRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('game_rooms').select('*').order('created_at', { ascending: false });
      if (profile.role !== 'admin') {
        query = query.or(`creator_id.eq.${profile.id},creator_id.is.null`);
      }
      const { data, error: dbError } = await query;
      if (dbError) {
        console.error('[GAME LIST ERROR]', dbError);
        setError(dbError.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.');
      } else if (data) {
        setRooms(data as GameRoom[]);
      }
    } catch (err: any) {
      console.error('[GAME LIST ERROR]', err);
      setError(err.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.');
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
    const url = `${window.location.origin}/#/game/join/${room.room_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(room.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Section C: HAPUS GAME
  const handleDeleteGame = async (gameId: string, gameTitle: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus game "${gameTitle}"?\nSemua data soal dan riwayat kuis terkait akan ikut terhapus.`)) {
      return;
    }
    setDeletingId(gameId);
    try {
      const { data, error: rpcError } = await supabase.rpc('delete_game', {
        p_game_id: gameId
      });

      if (rpcError) {
        console.error('[GAME DELETE ERROR]', rpcError);
        alert(rpcError.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.');
        return;
      }

      // Hapus game dari state/list
      setRooms(prev => prev.filter(r => r.id !== gameId));
      // Tampilkan notifikasi "Game berhasil dihapus"
      setNotification('Game berhasil dihapus');
      setTimeout(() => setNotification(null), 3500);
      // Refresh daftar game
      await loadRooms();
    } catch (err: any) {
      console.error('[GAME DELETE ERROR]', err);
      alert(err.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.');
    } finally {
      setDeletingId(null);
    }
  };

  // Section D: DETAIL GAME
  const handleOpenDetail = async (gameId: string) => {
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedGameDetail(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_game_detail', {
        p_game_id: gameId
      });

      if (rpcError) {
        console.error('[GAME DETAIL ERROR]', rpcError);
        setDetailError(rpcError.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.');
        return;
      }

      if (!data || !data.game) {
        console.error('[GAME DETAIL ERROR]', data);
        setDetailError('Detail game tidak ditemukan atau Anda tidak memiliki akses.');
        return;
      }

      setSelectedGameDetail({
        game: data.game,
        questions: data.questions || []
      });
    } catch (err: any) {
      console.error('[GAME DETAIL ERROR]', err);
      setDetailError(err.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.');
    } finally {
      setDetailLoading(false);
    }
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

      {/* NOTIFICATION BANNER */}
      {notification && (
        <div className="p-3.5 bg-emerald-100 border-2 border-emerald-600 rounded-xl text-xs font-black text-emerald-900 flex items-center justify-between shadow-[2px_2px_0_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-950 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-400">
                          {room.created_at ? new Date(room.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </span>
                        <button
                          onClick={() => handleDeleteGame(room.id, room.title)}
                          disabled={deletingId === room.id}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                          title="Hapus Game"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleOpenDetail(room.id)}
                        className="py-2 px-2 bg-white hover:bg-gray-100 border border-gray-900 rounded-lg text-[11px] font-bold text-gray-800 cursor-pointer flex items-center justify-center gap-1"
                        title="Lihat Butir Soal dan Detail Game"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>DETAIL</span>
                      </button>

                      <button
                        onClick={() => handleCopyLink(room)}
                        className="py-2 px-2 bg-white hover:bg-gray-100 border border-gray-900 rounded-lg text-[11px] font-bold text-gray-800 cursor-pointer flex items-center justify-center gap-1"
                      >
                        {copiedId === room.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-black">TERSALIN</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>LINK</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setStudentRoomCode(room.room_code);
                          setStudentMode(true);
                        }}
                        className="py-2 px-2 bg-gray-100 hover:bg-gray-200 border border-gray-900 rounded-lg text-[11px] font-bold text-gray-800 cursor-pointer flex items-center justify-center gap-1"
                        title="Masuk sebagai peserta uji coba"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>TEST</span>
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
        onClose={() => {
          setIsCreateOpen(false);
          loadRooms();
        }}
        creatorId={profile.id}
        creatorName={profile.nama_lengkap}
        onGameCreated={(newRoom) => {
          setIsCreateOpen(false);
          loadRooms();
          setActiveTeacherRoomId(newRoom.id);
        }}
      />

      {/* DETAIL GAME MODAL (Section D: get_game_detail) */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-50 overflow-y-auto font-body">
          <div className="bg-[#FAF6F0] rounded-2xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            
            {/* DETAIL MODAL HEADER */}
            <div className="p-4 md:p-5 bg-[#B4D3FF] border-b-2 border-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📋</span>
                <div>
                  <h2 className="text-lg md:text-xl font-black font-display uppercase tracking-tight text-gray-900 leading-none">
                    DETAIL GAME KUIS
                  </h2>
                  <p className="text-[11px] font-bold text-gray-700 mt-0.5">
                    Informasi lengkap, kunci jawaban, dan butir soal kuis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 bg-white rounded-lg border-2 border-gray-900 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-900" />
              </button>
            </div>

            {/* DETAIL MODAL BODY */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-6">
              {detailLoading ? (
                <div className="p-12 text-center space-y-2">
                  <div className="text-3xl animate-bounce">📋</div>
                  <div className="text-xs font-black uppercase text-gray-500">Memuat detail game dari Supabase...</div>
                </div>
              ) : detailError ? (
                <div className="p-4 bg-red-100 border-2 border-red-500 rounded-xl text-xs font-bold text-red-800 space-y-2">
                  <p>{detailError}</p>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="py-1 px-3 bg-white border border-red-500 rounded-md text-xs font-bold cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              ) : selectedGameDetail ? (
                <div className="space-y-6">
                  {/* GAME INFO */}
                  <div className="p-4 bg-white rounded-xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                      <div>
                        <h3 className="text-lg font-black font-display uppercase text-gray-900">
                          {selectedGameDetail.game.title}
                        </h3>
                        <p className="text-xs font-bold text-gray-600 mt-0.5">
                          {selectedGameDetail.game.subject} • Kelas {selectedGameDetail.game.class_level || (selectedGameDetail.game as any).class_name}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-[#FFD166] text-gray-900 border border-gray-900 rounded-full text-xs font-black uppercase tracking-wider self-start">
                        {selectedGameDetail.game.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-center">
                      <div className="p-2.5 bg-[#FAF6F0] rounded-lg border border-gray-900">
                        <span className="text-[10px] font-black uppercase text-gray-400 block">PIN GAME</span>
                        <span className="text-lg font-black font-mono text-gray-900 tracking-wider select-all">
                          {selectedGameDetail.game.pin}
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#FAF6F0] rounded-lg border border-gray-900">
                        <span className="text-[10px] font-black uppercase text-gray-400 block">KODE ROOM</span>
                        <span className="text-lg font-black font-mono text-blue-600 tracking-wider select-all">
                          {selectedGameDetail.game.room_code}
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#FAF6F0] rounded-lg border border-gray-900">
                        <span className="text-[10px] font-black uppercase text-gray-400 block">TOTAL SOAL</span>
                        <span className="text-lg font-black text-gray-900">
                          {selectedGameDetail.questions.length} Butir
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#FAF6F0] rounded-lg border border-gray-900">
                        <span className="text-[10px] font-black uppercase text-gray-400 block">WAKTU / SOAL</span>
                        <span className="text-lg font-black text-gray-900">
                          {selectedGameDetail.game.time_per_question}s
                        </span>
                      </div>
                    </div>

                    {/* LINK BOX & ACTION BUTTONS */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/#/game/join/${selectedGameDetail.game.room_code}`;
                          navigator.clipboard.writeText(link);
                          setCopiedDetailLink(true);
                          setTimeout(() => setCopiedDetailLink(false), 2000);
                        }}
                        className="flex-1 py-2 px-3 bg-white hover:bg-gray-50 border border-gray-900 rounded-lg text-xs font-black uppercase cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {copiedDetailLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedDetailLink ? 'LINK TERSALIN!' : 'SALIN LINK SISWA'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(String(selectedGameDetail.game.pin));
                          setCopiedDetailPin(true);
                          setTimeout(() => setCopiedDetailPin(false), 2000);
                        }}
                        className="flex-1 py-2 px-3 bg-white hover:bg-gray-50 border border-gray-900 rounded-lg text-xs font-black uppercase cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {copiedDetailPin ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedDetailPin ? 'PIN TERSALIN!' : 'SALIN PIN'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          setActiveTeacherRoomId(selectedGameDetail.game.id);
                        }}
                        className="py-2 px-4 bg-[#C1F2D0] hover:bg-emerald-300 border border-gray-900 rounded-lg text-xs font-black uppercase cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-gray-900" />
                        <span>BUKA LOBBY</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteGame(selectedGameDetail.game.id, selectedGameDetail.game.title);
                          setIsDetailModalOpen(false);
                        }}
                        className="py-2 px-3 bg-red-100 hover:bg-red-200 text-red-700 border border-red-700 rounded-lg text-xs font-black uppercase cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>HAPUS</span>
                      </button>
                    </div>
                  </div>

                  {/* QUESTIONS LIST */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">
                      DAFTAR BUTIR SOAL & KUNCI JAWABAN ({selectedGameDetail.questions.length})
                    </h4>

                    <div className="space-y-3">
                      {selectedGameDetail.questions.map((q: any, idx: number) => {
                        const optA = q.option_a || q.optionA || '';
                        const optB = q.option_b || q.optionB || '';
                        const optC = q.option_c || q.optionC || '';
                        const optD = q.option_d || q.optionD || '';
                        const correct = (q.correct_answer || q.correctAnswer || 'A').toUpperCase();

                        return (
                          <div key={q.id || idx} className="p-4 bg-white rounded-xl border-2 border-gray-900 space-y-2.5">
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-md bg-[#FFD166] border border-gray-900 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-xs md:text-sm font-bold text-gray-900 flex-1 leading-relaxed">
                                {q.question}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                              {[
                                { key: 'A', text: optA },
                                { key: 'B', text: optB },
                                { key: 'C', text: optC },
                                { key: 'D', text: optD }
                              ].map(({ key, text }) => {
                                const isCorrect = correct === key;
                                return (
                                  <div
                                    key={key}
                                    className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-2 ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-black ring-1 ring-emerald-500'
                                        : 'bg-[#FAF6F0] border-gray-300 text-gray-700'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-black ${
                                        isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                                      }`}
                                    >
                                      {key}
                                    </span>
                                    <span className="flex-1 line-clamp-2">{text}</span>
                                    {isCorrect && (
                                      <span className="text-[10px] font-black text-emerald-700 flex items-center gap-0.5">
                                        ✓ BENAR
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* DETAIL MODAL FOOTER */}
            <div className="p-4 bg-gray-100 border-t-2 border-gray-900 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="py-2.5 px-6 bg-white border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer hover:bg-gray-50 text-gray-900"
              >
                TUTUP
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
