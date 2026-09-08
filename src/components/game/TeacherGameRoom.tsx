/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Copy, Share2, Play, Users, Trophy, Award, 
  ChevronRight, CheckCircle2, Clock, XCircle, RotateCcw, AlertTriangle, BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  fetchGameRoomApi, 
  startGameRoomApi, 
  nextQuestionApi, 
  fetchGameLeaderboardApi, 
  fetchGameResultsApi, 
  closeGameRoomApi,
  joinGameRoomApi
} from '../../lib/game_store';
import { GameRoom, GameQuestion, GameParticipant } from '../../types';

interface TeacherGameRoomProps {
  roomIdOrCode: string;
  onBack: () => void;
  creatorId?: string;
}

export const TeacherGameRoom: React.FC<TeacherGameRoomProps> = ({
  roomIdOrCode,
  onBack,
  creatorId
}) => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Live countdown state
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [showQuestionResult, setShowQuestionResult] = useState(false);
  const [leaderboard, setLeaderboard] = useState<GameParticipant[]>([]);
  const [finalResults, setFinalResults] = useState<any[]>([]);

  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // Synchronized server-based timer formula
  const calculateRemainingTime = (questionStartedAt?: string | null, duration: number = 20): number => {
    if (!questionStartedAt) return duration;
    const started = Date.parse(questionStartedAt);
    if (isNaN(started)) return duration;
    const elapsed = (Date.now() - started) / 1000;
    return Math.max(0, Math.ceil(duration - elapsed));
  };

  // Load initial data
  const loadRoomData = async () => {
    try {
      const res = await fetchGameRoomApi(roomIdOrCode, false);
      if (res.success && res.room) {
        setRoom(res.room);
        if (res.questions) setQuestions(res.questions);
        if (res.participants) setParticipants(res.participants);
      } else {
        setError(res.error || 'Room tidak ditemukan');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat room');
    } finally {
      setLoading(false);
    }
  };

  // Load Participants Helper
  const loadParticipants = async (gId: string) => {
    try {
      const { data: pData, error: pError } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_id', gId)
        .order('participant_number', { ascending: true });

      if (!pError && pData) {
        console.log('[GAME PARTICIPANT] changed', pData.length);
        setParticipants(
          pData.map((p: any) => ({
            ...p,
            participant_number: String(p.participant_number).padStart(2, '0')
          }))
        );
      }
    } catch (e) {
      console.error('[LOAD PARTICIPANTS ERROR]', e);
    }
  };

  // Load Leaderboard Helper
  const loadLeaderboard = async (gId: string) => {
    try {
      const { data, error: lbErr } = await supabase.rpc('get_game_leaderboard', {
        p_game_id: gId
      });
      if (!lbErr && data) {
        console.log('[GAME LEADERBOARD] changed', data.length);
        const formatted: GameParticipant[] = data.map((p: any) => ({
          id: p.participant_id || p.id,
          game_id: gId,
          participant_name: p.participant_name,
          participant_number: String(p.participant_number).padStart(2, '0'),
          total_score: p.total_score || 0,
          correct_count: p.correct_count || 0,
          wrong_count: p.wrong_count || 0,
          unanswered_count: 0
        }));
        setLeaderboard(formatted);
      }
    } catch (e) {
      console.error('[LOAD LEADERBOARD ERROR]', e);
    }
  };

  useEffect(() => {
    loadRoomData();

    // Light auto poll fallback (1.5s) to guarantee updates if network drops
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetchGameRoomApi(roomIdOrCode, false);
        if (res.success && res.room) {
          setRoom(res.room);
          if (res.participants) setParticipants(res.participants);
          if (res.questions) setQuestions(res.questions);

          // If playing or finished, update leaderboard
          if (res.room.status === 'playing' || res.room.status === 'finished') {
            const lbRes = await fetchGameLeaderboardApi(res.room.id);
            if (lbRes.success && lbRes.leaderboard) {
              setLeaderboard(lbRes.leaderboard);
            }
          }
          if (res.room.status === 'finished' || res.room.status === 'closed') {
            const resData = await fetchGameResultsApi(res.room.id);
            if (resData.success && resData.results) {
              setFinalResults(resData.results);
            }
          }
        }
      } catch (e) {
        // silent poll error
      }
    }, 1500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [roomIdOrCode]);

  // Single Realtime Subscription for Teacher via postgres_changes
  useEffect(() => {
    if (!room?.id) return;
    const gId = room.id;

    console.log('[GAME REALTIME] subscribing for game', gId);

    const channel = supabase.channel(`game-realtime-${gId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${gId}`
        },
        (payload: any) => {
          console.log('[GAME REALTIME] GAME ROOM UPDATE', payload);
          if (payload.new) {
            const updated = payload.new;
            if (updated.status === 'finished') {
              console.log('[GAME REALTIME] GAME FINISHED');
              fetchGameResultsApi(gId).then((resData) => {
                if (resData.success && resData.results) {
                  setFinalResults(resData.results);
                }
              });
              loadLeaderboard(gId);
            }
            if (updated.current_question_order !== undefined) {
              console.log('[GAME REALTIME] QUESTION CHANGED', updated.current_question_order);
            }
            loadRoomData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          filter: `game_id=eq.${gId}`
        },
        (payload: any) => {
          console.log('[GAME REALTIME] PARTICIPANT UPDATE', payload);
          loadParticipants(gId);
          loadLeaderboard(gId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_answers',
          filter: `game_id=eq.${gId}`
        },
        (payload: any) => {
          console.log('[GAME REALTIME] ANSWER UPDATE', payload);
          loadLeaderboard(gId);
        }
      )
      .subscribe((status, err) => {
        console.log('[GAME REALTIME]', status, gId);
        if (status === 'SUBSCRIBED') {
          console.log('[GAME REALTIME] SUBSCRIBED');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('[GAME REALTIME] CHANNEL_ERROR');
          if (err) console.error('[GAME REALTIME] channel error details', err);
        } else if (status === 'TIMED_OUT') {
          console.log('[GAME REALTIME] TIMED_OUT');
        } else if (status === 'CLOSED') {
          console.log('[GAME REALTIME] CLOSED');
        }
      });

    return () => {
      console.log('[GAME REALTIME] cleaning up channel for', gId);
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  // Question Timer Loop (server-synced)
  useEffect(() => {
    if (!room || room.status !== 'playing' || !room.question_start_time) return;

    setShowQuestionResult(false);
    const duration = room.time_per_question || 20;
    const startTime = room.question_start_time;

    const initialRemaining = calculateRemainingTime(startTime, duration);
    setSecondsLeft(initialRemaining);
    console.log('[GAME TIMER] synced (teacher)', initialRemaining);

    const tick = () => {
      const remaining = calculateRemainingTime(startTime, duration);
      setSecondsLeft(remaining);

      if (remaining === 0) {
        setShowQuestionResult(true);
      }
    };

    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [room?.status, room?.question_start_time, room?.time_per_question]);

  // Start game handler via direct RPC
  const handleStartGame = async () => {
    if (!room) return;
    try {
      console.log('[GAME START] invoking rpc start_game for', room.id);
      const { data, error } = await supabase.rpc('start_game', {
        p_game_id: room.id
      });

      if (error) {
        console.error('[GAME START ERROR]', error);
        alert(error.message || 'Gagal memulai game');
        return;
      }

      console.log('[GAME STATE] changed to playing', data);
      await loadRoomData();
      setShowQuestionResult(false);
    } catch (err: any) {
      console.error('[GAME ERROR]', err);
      alert(err?.message || 'Gagal memulai game');
    }
  };

  // Next question handler via direct RPC
  const handleNextQuestion = async () => {
    if (!room) return;
    try {
      console.log('[GAME NEXT] invoking rpc next_game_question for', room.id);
      const { data, error } = await supabase.rpc('next_game_question', {
        p_game_id: room.id
      });

      if (error) {
        console.error('[GAME NEXT ERROR]', error);
        alert(error.message || 'Gagal lanjut soal');
        return;
      }

      console.log('[GAME QUESTION] changed', data);
      await loadRoomData();
      setShowQuestionResult(false);

      if (data?.status === 'finished' || room.status === 'finished') {
        const resData = await fetchGameResultsApi(room.id);
        if (resData.success && resData.results) {
          setFinalResults(resData.results);
        }
        await loadLeaderboard(room.id);
      }
    } catch (err: any) {
      console.error('[GAME ERROR]', err);
      alert(err?.message || 'Gagal lanjut soal');
    }
  };

  // Close room handler
  const handleCloseRoom = async () => {
    if (!room) return;
    if (!confirm('Apakah Anda yakin ingin menutup room game ini? Siswa tidak akan bisa menjawab lagi.')) return;
    try {
      const res = await closeGameRoomApi(room.id);
      if (res.success && res.room) {
        setRoom(res.room);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menutup room');
    }
  };

  // Simulated student bot for testing convenience
  const handleAddTestStudent = async () => {
    if (!room) return;
    const names = ['Ahmad Syahputra', 'Siti Rahmah', 'Budi Santoso', 'Dewi Lestari', 'Rizky Pratama'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    await joinGameRoomApi({
      room_code: room.room_code,
      pin: room.pin,
      participant_name: `${randomName} (${Math.floor(Math.random() * 90 + 10)})`
    });
    loadRoomData();
  };

  const gameJoinUrl = room 
    ? `${window.location.origin}${window.location.pathname}#/game/join/${room.room_code}`
    : '';

  const handleCopyLink = () => {
    if (!gameJoinUrl) return;
    navigator.clipboard.writeText(gameJoinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!room) return;
    const shareText = `Yuk ikuti Game Kuis EMKAIN: ${room.title}!\nKode: ${room.room_code}\nPIN: ${room.pin}\nLink: ${gameJoinUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: room.title, text: shareText, url: gameJoinUrl });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3 font-body">
        <div className="text-4xl animate-bounce">🎮</div>
        <div className="text-sm font-black uppercase text-gray-800 font-display">MEMUAT ROOM GAME...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="p-6 bg-red-50 border-2 border-red-500 rounded-2xl max-w-xl mx-auto text-center space-y-4 font-body">
        <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
        <div className="text-sm font-black text-red-900">{error || 'Room tidak ditemukan'}</div>
        <button
          onClick={onBack}
          className="py-2.5 px-4 bg-white border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer"
        >
          KEMBALI KE GAME CENTER
        </button>
      </div>
    );
  }

  const currentQ = questions[room.current_question_index];
  const maxScore = Math.max(...leaderboard.map(p => p.total_score || 0), 1000);

  return (
    <div className="space-y-6 font-body pb-12">
      
      {/* ROOM TOP BAR */}
      <div className="p-4 md:p-5 bg-white rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-[#FAF6F0] hover:bg-gray-100 rounded-xl border border-gray-900 cursor-pointer text-gray-800"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg md:text-xl font-black font-display uppercase tracking-tight text-gray-900 leading-tight">
                {room.title}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full border border-gray-900 text-[10px] font-black uppercase ${
                room.status === 'waiting' ? 'bg-[#FFD166] text-gray-900' :
                room.status === 'playing' ? 'bg-[#C1F2D0] text-gray-900 animate-pulse' :
                room.status === 'finished' ? 'bg-[#B4D3FF] text-gray-900' :
                'bg-gray-200 text-gray-600'
              }`}>
                {room.status === 'waiting' ? 'LOBBY (MENUNGGU SISWA)' :
                 room.status === 'playing' ? 'LIVE (SEDANG BERJALAN)' :
                 room.status === 'finished' ? 'SELESAI' : 'DITUTUP'}
              </span>
            </div>
            <p className="text-xs font-bold text-gray-600 mt-0.5">
              {room.subject} • Kelas {room.class_level} • {room.question_count} Soal • {room.time_per_question}s / Soal
            </p>
          </div>
        </div>

        {/* PIN & CODE BADGES */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 bg-[#FAF6F0] rounded-xl border border-gray-900 text-center">
            <span className="text-[9px] font-black uppercase text-gray-400 block leading-none">PIN</span>
            <span className="text-lg font-black text-gray-900 font-display tracking-wider leading-none">
              {room.pin}
            </span>
          </div>
          <div className="px-3.5 py-1.5 bg-[#FAF6F0] rounded-xl border border-gray-900 text-center">
            <span className="text-[9px] font-black uppercase text-gray-400 block leading-none">KODE</span>
            <span className="text-lg font-black text-blue-600 font-display tracking-wider leading-none">
              {room.room_code}
            </span>
          </div>
          {room.status !== 'closed' && (
            <button
              onClick={handleCloseRoom}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded-xl text-xs font-black uppercase cursor-pointer"
            >
              TUTUP ROOM
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: LOBBY WAITING */}
      {/* ========================================================================= */}
      {room.status === 'waiting' && (
        <div className="space-y-6">
          
          {/* SHARE & JOIN INVITATION BANNER */}
          <div className="p-6 bg-[#FFD166] rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-900 text-xs font-black uppercase">
              <Users className="w-3.5 h-3.5 text-gray-800" />
              <span>{participants.length} PESERTA TELAH BERGABUNG</span>
            </div>

            <div>
              <h3 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-gray-900">
                BAGIKAN PIN & LINK KE SISWA
              </h3>
              <p className="text-xs md:text-sm font-bold text-gray-800 mt-1 max-w-lg mx-auto">
                Siswa membuka link kuis atau memasukkan PIN <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-900 text-base">{room.pin}</span> untuk langsung masuk ke room.
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-lg mx-auto pt-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 min-w-[150px] py-3 px-5 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)] flex items-center justify-center gap-2"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'LINK TERSALIN!' : 'SALIN LINK'}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex-1 min-w-[150px] py-3 px-5 bg-[#B4D3FF] hover:bg-blue-300 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)] flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>BAGIKAN LINK</span>
              </button>

              <button
                onClick={handleStartGame}
                disabled={participants.length === 0}
                className="w-full py-3.5 px-6 bg-[#C1F2D0] hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 border-2 border-gray-900 rounded-xl font-black text-sm uppercase tracking-wider cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-gray-900" />
                <span>MULAI GAME SEKARANG ({participants.length} PESERTA)</span>
              </button>
            </div>

            {/* Helper for quick test */}
            <div className="pt-2">
              <button
                onClick={handleAddTestStudent}
                className="text-[11px] font-bold text-gray-700 underline hover:text-gray-900 cursor-pointer"
              >
                + Simulasi Masukkan 1 Siswa Contoh untuk Uji Coba
              </button>
            </div>
          </div>

          {/* PARTICIPANTS LIST */}
          <div className="p-6 bg-white rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>DAFTAR PESERTA DI LOBBY ({participants.length})</span>
              </h4>
              <span className="text-xs font-bold text-gray-400">
                Memperbarui otomatis secara realtime
              </span>
            </div>

            {participants.length === 0 ? (
              <div className="p-8 bg-[#FAF6F0] rounded-xl border border-dashed border-gray-400 text-center space-y-2">
                <div className="text-3xl">⏳</div>
                <div className="text-sm font-black uppercase text-gray-700">BELUM ADA SISWA YANG MASUK</div>
                <p className="text-xs font-medium text-gray-500 max-w-sm mx-auto">
                  Bagikan Link atau PIN di atas kepada siswa Anda agar mereka dapat segera bergabung ke dalam room kuis.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 flex items-center gap-2.5 shadow-[2px_2px_0_rgba(0,0,0,1)]"
                  >
                    <span className="w-7 h-7 rounded-lg bg-[#FFD166] border border-gray-900 flex items-center justify-center font-black text-xs text-gray-900 flex-shrink-0">
                      {p.participant_number}
                    </span>
                    <div className="truncate flex-1">
                      <div className="text-xs font-black text-gray-900 truncate" title={p.participant_name}>
                        {p.participant_name}
                      </div>
                      <span className="text-[9px] font-bold text-gray-400">Siap</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: PLAYING ACTIVE QUIZ */}
      {/* ========================================================================= */}
      {room.status === 'playing' && currentQ && (
        <div className="space-y-6">
          
          {/* QUESTION HEADER & TIMER BANNER */}
          <div className="p-4 md:p-6 bg-[#FAF6F0] rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] space-y-4">
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[#FF8B7B] rounded-full border-2 border-gray-900 text-xs font-black uppercase text-gray-900">
                  SOAL {room.current_question_index + 1} / {room.question_count}
                </span>
                <span className="text-xs font-bold text-gray-600">
                  {participants.length} Peserta Aktif
                </span>
              </div>

              {/* COUNTDOWN DISPLAY */}
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border-2 border-gray-900 font-display font-black text-lg ${
                secondsLeft <= 5 ? 'bg-red-500 text-white animate-bounce' : 'bg-[#FFD166] text-gray-900'
              }`}>
                <Clock className="w-5 h-5" />
                <span>00:{String(secondsLeft).padStart(2, '0')}</span>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="w-full h-3 bg-gray-200 rounded-full border border-gray-900 overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-1000"
                style={{ width: `${(secondsLeft / (room.time_per_question || 20)) * 100}%` }}
              />
            </div>

            {/* QUESTION TEXT */}
            <div className="p-4 md:p-6 bg-white rounded-xl border-2 border-gray-900">
              <h3 className="text-base md:text-xl font-black text-gray-900 leading-relaxed [overflow-wrap:anywhere] whitespace-normal">
                {currentQ.question}
              </h3>
            </div>

            {/* OPTIONS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                const optKey = `option_${opt.toLowerCase()}` as keyof GameQuestion;
                const isCorrect = currentQ.correct_answer === opt;
                const badgeBg = opt === 'A' ? 'bg-[#FF8B7B]' : opt === 'B' ? 'bg-[#B4D3FF]' : opt === 'C' ? 'bg-[#FFD166]' : 'bg-[#C1F2D0]';

                return (
                  <div
                    key={opt}
                    className={`p-3.5 rounded-xl border-2 border-gray-900 flex items-start gap-3 ${
                      isCorrect ? 'bg-emerald-50 border-emerald-600 shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'bg-white'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg border-2 border-gray-900 flex items-center justify-center font-black text-xs text-gray-900 flex-shrink-0 ${badgeBg}`}>
                      {opt}
                    </span>
                    <div className="flex-1">
                      <div className="text-xs md:text-sm font-bold text-gray-900 leading-normal [overflow-wrap:anywhere]">
                        {(currentQ as any)[optKey]}
                      </div>
                      {isCorrect && (
                        <span className="inline-block mt-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-400">
                          ✓ KUNCI JAWABAN BENAR
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TEACHER ADVANCE CONTROL */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200">
              <div className="text-xs font-bold text-gray-600">
                {secondsLeft === 0 ? 'WAKTU SOAL HABIS' : 'Kuis sedang berlangsung...'}
              </div>

              <button
                onClick={handleNextQuestion}
                className="w-full sm:w-auto py-3 px-6 bg-[#FFD166] hover:bg-yellow-300 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <span>{room.current_question_index + 1 >= room.question_count ? 'SELESAIKAN GAME & LIHAT HASIL' : 'SOAL BERIKUTNYA'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* REALTIME LEADERBOARD & PERFORMANCE DIAGRAM DURING GAME */}
          <div className="p-6 bg-white rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>PAPAN PERINGKAT REALTIME (TOP 3)</span>
              </h4>
              <span className="text-xs font-bold text-gray-400">
                Peringkat berdasarkan Skor Tertinggi & Kecepatan
              </span>
            </div>

            {/* TOP 3 PODIUM DISPLAY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {leaderboard.slice(0, 3).map((p, idx) => {
                const podiumColors = [
                  'bg-[#FFD166] border-gray-900', // 1st Gold
                  'bg-[#B4D3FF] border-gray-900', // 2nd Silver
                  'bg-[#FF8B7B] border-gray-900'  // 3rd Bronze
                ];
                const medals = ['🥇 JUARA 1', '🥈 JUARA 2', '🥉 JUARA 3'];

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border-2 shadow-[3px_3px_0_rgba(0,0,0,1)] text-center space-y-2 ${podiumColors[idx] || 'bg-white'}`}
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-gray-900 block">
                      {medals[idx]}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-900 mx-auto">
                      {p.participant_number}
                    </div>
                    <div className="text-sm font-black text-gray-900 truncate" title={p.participant_name}>
                      {p.participant_name}
                    </div>
                    <div className="text-xl font-black font-display text-[#1E1E1E]">
                      {p.total_score.toLocaleString('id-ID')} <span className="text-[11px]">PTS</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PERFORMANCE DIAGRAM: BAR CHART */}
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-800">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>DIAGRAM PERFORMA SKOR</span>
              </div>

              <div className="space-y-2.5">
                {leaderboard.slice(0, 5).map((p, i) => {
                  const widthPct = Math.max(8, Math.min(100, Math.round((p.total_score / maxScore) * 100)));
                  const barColors = ['bg-[#FFD166]', 'bg-[#B4D3FF]', 'bg-[#C1F2D0]', 'bg-[#FF8B7B]', 'bg-amber-200'];

                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                        <span className="truncate">
                          <span className="font-mono font-black mr-1.5">{p.participant_number}</span>
                          {p.participant_name}
                        </span>
                        <span className="font-black text-gray-900 ml-2">
                          {p.total_score.toLocaleString('id-ID')} POIN
                        </span>
                      </div>
                      <div className="w-full h-4 bg-gray-100 rounded-lg border border-gray-900 overflow-hidden">
                        <div
                          className={`h-full ${barColors[i % barColors.length]} border-r border-gray-900 transition-all duration-700 flex items-center justify-end pr-1`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3 & 4: FINISHED / CLOSED SUMMARY */}
      {/* ========================================================================= */}
      {(room.status === 'finished' || room.status === 'closed') && (
        <div className="space-y-6">
          
          {/* WINNERS PODIUM BANNER */}
          <div className="p-6 md:p-8 bg-[#FAF6F0] rounded-2xl border-2 border-gray-900 shadow-[5px_5px_0_rgba(0,0,0,1)] text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFD166] border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] text-3xl mx-auto">
              🏆
            </div>

            <div>
              <h3 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-gray-900">
                GAME KUIS TELAH SELESAI!
              </h3>
              <p className="text-xs md:text-sm font-bold text-gray-600 mt-1">
                Selamat kepada seluruh peserta atas partisipasinya dalam kuis {room.title}
              </p>
            </div>

            {/* TOP 3 PODIUM */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {leaderboard.slice(0, 3).map((p, idx) => {
                const podiumBgs = ['bg-[#FFD166]', 'bg-[#B4D3FF]', 'bg-[#FF8B7B]'];
                const medals = ['🥇 JUARA 1', '🥈 JUARA 2', '🥉 JUARA 3'];

                return (
                  <div
                    key={p.id}
                    className={`p-5 rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] text-center space-y-2.5 ${podiumBgs[idx] || 'bg-white'}`}
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-gray-900 block">
                      {medals[idx]}
                    </span>
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-900 mx-auto">
                      {p.participant_number}
                    </div>
                    <div className="text-sm md:text-base font-black text-gray-900 truncate" title={p.participant_name}>
                      {p.participant_name}
                    </div>
                    <div className="text-2xl font-black font-display text-gray-900">
                      {p.total_score.toLocaleString('id-ID')}
                      <span className="text-xs font-bold block text-gray-700">TOTAL POIN</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PERFORMANCE DIAGRAM BAR CHART */}
          <div className="p-6 bg-white rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>DIAGRAM PERFORMA PESERTA</span>
              </h4>
              <span className="text-xs font-bold text-gray-400">
                Visualisasi Perolehan Skor
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {leaderboard.slice(0, 8).map((p, i) => {
                const widthPct = Math.max(10, Math.min(100, Math.round((p.total_score / maxScore) * 100)));
                const barBgs = ['bg-[#FFD166]', 'bg-[#B4D3FF]', 'bg-[#C1F2D0]', 'bg-[#FF8B7B]', 'bg-purple-200'];

                return (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                      <span className="truncate">
                        <span className="font-mono font-black mr-2">{p.participant_number}</span>
                        {p.participant_name}
                      </span>
                      <span className="font-black text-gray-900">
                        {p.total_score.toLocaleString('id-ID')} POIN
                      </span>
                    </div>
                    <div className="w-full h-4 bg-gray-100 rounded-lg border border-gray-900 overflow-hidden">
                      <div
                        className={`h-full ${barBgs[i % barBgs.length]} border-r border-gray-900 transition-all duration-700`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COMPLETE PARTICIPANTS RESULTS TABLE */}
          <div className="p-6 bg-white rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>TABEL HASIL LENGKAP PESERTA ({finalResults.length})</span>
              </h4>
              <span className="text-xs font-bold text-gray-400">
                Disimpan permanen untuk arsip nilai guru
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF6F0] border-b-2 border-gray-900 text-gray-900 uppercase font-black">
                    <th className="py-3 px-3">No</th>
                    <th className="py-3 px-3">Peserta</th>
                    <th className="py-3 px-3 text-center">Benar</th>
                    <th className="py-3 px-3 text-center">Salah</th>
                    <th className="py-3 px-3 text-center">Tidak Menjawab</th>
                    <th className="py-3 px-3 text-right">Total Skor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-bold">
                  {finalResults.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-black text-gray-900">
                        {p.participant_number}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-gray-900">
                        {p.participant_name}
                      </td>
                      <td className="py-2.5 px-3 text-center text-emerald-600 font-black">
                        {p.correct_count || 0}
                      </td>
                      <td className="py-2.5 px-3 text-center text-red-500 font-black">
                        {p.wrong_count || 0}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-400 font-black">
                        {p.unanswered_count || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right font-display font-black text-sm text-gray-900">
                        {(p.total_score || 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                  {finalResults.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-gray-400 font-medium">
                        Belum ada data peserta yang terekam.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onBack}
              className="py-3 px-6 bg-white hover:bg-gray-100 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)]"
            >
              KEMBALI KE GAME CENTER
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
