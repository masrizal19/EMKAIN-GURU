/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Copy, Share2, Play, Users, Trophy, Award, 
  ChevronRight, CheckCircle2, Clock, XCircle, RotateCcw, AlertTriangle, BarChart3,
  Maximize2, Minimize2, Monitor
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
  const [isHostFullscreen, setIsHostFullscreen] = useState(false);

  // Live countdown state
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [showQuestionResult, setShowQuestionResult] = useState(false);
  const [leaderboard, setLeaderboard] = useState<GameParticipant[]>([]);
  const [finalResults, setFinalResults] = useState<any[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // Synchronize fullscreen state with browser fullscreenchange event
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFullscreen = Boolean(document.fullscreenElement);
      if (!isNativeFullscreen && isHostFullscreen) {
        // user pressed ESC
        setIsHostFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isHostFullscreen]);

  // Fullscreen toggle handler with browser API & fallback
  const toggleFullscreen = async () => {
    try {
      if (!isHostFullscreen && !document.fullscreenElement) {
        setIsHostFullscreen(true);
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen().catch(() => {});
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        setIsHostFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[FULLSCREEN TOGGLE EXCEPTION]', e);
      setIsHostFullscreen((prev) => !prev);
    }
  };

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

    const channelName = `game-public-state-${gId}`;
    console.log('[GAME PUBLIC REALTIME] (teacher) subscribing on channel', channelName);

    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_public_state',
          filter: `game_id=eq.${gId}`
        },
        (payload: any) => {
          console.log('[GAME PUBLIC REALTIME] (teacher)', payload);
          const state = (payload.new || payload.old) as any;
          if (!state) return;
          if (state.current_question_order !== undefined) {
            console.log('[GAME QUESTION CHANGED]', state.current_question_order);
          }
          if (state.status === 'finished') {
            console.log('[GAME REALTIME] GAME FINISHED');
            fetchGameResultsApi(gId).then((resData) => {
              if (resData.success && resData.results) {
                setFinalResults(resData.results);
              }
            });
            loadLeaderboard(gId);
          }
          loadRoomData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${gId}`
        },
        (payload: any) => {
          console.log('[GAME ROOM UPDATE] (teacher)', payload);
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
              console.log('[GAME QUESTION CHANGED]', updated.current_question_order);
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
          console.log('[GAME PARTICIPANT CHANGED]', payload);
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
          console.log('[GAME LEADERBOARD CHANGED]', payload);
          loadLeaderboard(gId);
        }
      )
      .subscribe((status, err) => {
        console.log('[GAME PUBLIC REALTIME STATUS] (teacher)', status);
        if (status === 'SUBSCRIBED') {
          // Connected
        } else if (status === 'CHANNEL_ERROR') {
          if (err) console.error('[GAME PUBLIC REALTIME] (teacher) channel error details', err);
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
    console.log('[GAME TIMER SYNC]', initialRemaining);

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

  // Set Correct Answer handler via direct RPC
  const handleSetCorrectAnswer = async (questionId: string, correctLetter: 'A' | 'B' | 'C' | 'D') => {
    if (!questionId) return;
    try {
      const { error: rpcErr } = await supabase.rpc('set_game_question_correct_answer', {
        p_question_id: questionId,
        p_correct_answer: correctLetter
      });

      if (rpcErr) {
        console.error('[SET CORRECT ANSWER ERROR]', rpcErr);
        alert('Gagal mengubah kunci jawaban: ' + (rpcErr.message || 'Error'));
        return;
      }

      // Update local state on success
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, correct_answer: correctLetter } : q))
      );
    } catch (e: any) {
      console.error('[SET CORRECT ANSWER EXCEPTION]', e);
      alert('Terjadi kesalahan saat mengubah kunci jawaban');
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

  const p1 = leaderboard[0];
  const p2 = leaderboard[1];
  const p3 = leaderboard[2];

  // =========================================================================
  // HOST / FULLSCREEN DISPLAY OVERLAY
  // =========================================================================
  if (isHostFullscreen) {
    return (
      <div 
        ref={containerRef}
        className="fixed inset-0 z-50 bg-[#FAF6F0] p-4 md:p-8 flex flex-col justify-between overflow-y-auto font-body select-none"
      >
        {/* HOST FULLSCREEN TOP BAR */}
        <div className="p-4 bg-white rounded-2xl border-3 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FFD166] rounded-xl border-2 border-gray-900 font-display font-black text-sm">
              HOST DISPLAY
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-2xl font-black font-display uppercase tracking-tight text-gray-900">
                  {room.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full border border-gray-900 text-[10px] font-black uppercase bg-[#C1F2D0] text-gray-900">
                  {room.subject} • KELAS {room.class_level}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* PIN & CODE */}
            <div className="px-3.5 py-1.5 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 text-center">
              <span className="text-[9px] font-black uppercase text-gray-500 block leading-none">PIN</span>
              <span className="text-xl font-black text-gray-900 font-display tracking-wider leading-none">
                {room.pin}
              </span>
            </div>
            <div className="px-3.5 py-1.5 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 text-center">
              <span className="text-[9px] font-black uppercase text-gray-500 block leading-none">KODE</span>
              <span className="text-xl font-black text-blue-600 font-display tracking-wider leading-none">
                {room.room_code}
              </span>
            </div>

            {/* LIVE TIMER IN FULLSCREEN */}
            {room.status === 'playing' && (
              <div className={`flex items-center gap-2 px-5 py-2 rounded-xl border-2 border-gray-900 font-display font-black text-2xl ${
                secondsLeft <= 5 ? 'bg-red-500 text-white animate-bounce' : 'bg-[#FFD166] text-gray-900'
              }`}>
                <Clock className="w-6 h-6" />
                <span>00:{String(secondsLeft).padStart(2, '0')}</span>
              </div>
            )}

            {/* MANUAL ADVANCE BUTTON */}
            {room.status === 'playing' && (
              <button
                onClick={handleNextQuestion}
                className="py-2.5 px-5 bg-[#FFD166] hover:bg-yellow-300 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <span>{room.current_question_index + 1 >= room.question_count ? 'SELESAIKAN GAME' : 'SOAL BERIKUTNYA'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* EXIT FULLSCREEN BUTTON */}
            <button
              onClick={toggleFullscreen}
              className="py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)] flex items-center gap-1.5"
            >
              <Minimize2 className="w-4 h-4" />
              <span>EXIT FULLSCREEN</span>
            </button>
          </div>
        </div>

        {/* HOST FULLSCREEN BODY */}
        <div className="flex-1 my-6 flex flex-col justify-center">
          {/* LOBBY MODE IN FULLSCREEN */}
          {room.status === 'waiting' && (
            <div className="max-w-4xl mx-auto w-full space-y-6 text-center">
              <div className="p-8 bg-[#FFD166] rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] space-y-4">
                <span className="inline-block px-4 py-1.5 bg-white rounded-full border-2 border-gray-900 text-sm font-black uppercase">
                  RUANG TUNGGU KUIS • {participants.length} PESERTA BERGABUNG
                </span>
                <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight text-gray-900">
                  MASUK KE KUIS: PIN {room.pin}
                </h1>
                <p className="text-base font-bold text-gray-800">
                  Buka link join atau masukkan PIN di atas untuk bergabung ke room ini.
                </p>

                <div className="pt-4 flex justify-center">
                  <button
                    onClick={handleStartGame}
                    disabled={participants.length === 0}
                    className="py-4 px-8 bg-[#C1F2D0] hover:bg-emerald-300 disabled:opacity-40 text-gray-900 border-3 border-gray-900 rounded-2xl font-black text-lg uppercase tracking-wider cursor-pointer shadow-[4px_4px_0_rgba(0,0,0,1)] flex items-center gap-3"
                  >
                    <Play className="w-6 h-6 fill-gray-900" />
                    <span>MULAI GAME SEKARANG ({participants.length} PESERTA)</span>
                  </button>
                </div>
              </div>

              {/* PARTICIPANTS GRID */}
              <div className="p-6 bg-white rounded-3xl border-3 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>PESERTA TERHUBUNG ({participants.length})</span>
                  </h3>
                  <span className="text-xs font-bold text-gray-400">Realtime Update</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[40vh] overflow-y-auto p-1">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 flex items-center gap-2.5 shadow-[2px_2px_0_rgba(0,0,0,1)]"
                    >
                      <span className="w-8 h-8 rounded-lg bg-[#FFD166] border border-gray-900 flex items-center justify-center font-black text-xs text-gray-900 flex-shrink-0">
                        {p.participant_number}
                      </span>
                      <span className="text-xs font-black text-gray-900 truncate" title={p.participant_name}>
                        {p.participant_name}
                      </span>
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <div className="col-span-full py-8 text-center text-gray-500 font-bold">
                      Menunggu peserta bergabung...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PLAYING MODE IN FULLSCREEN */}
          {room.status === 'playing' && currentQ && (
            <div className="max-w-6xl mx-auto w-full space-y-6">
              {/* QUESTION BADGE & PROGRESS */}
              <div className="flex items-center justify-between">
                <span className="px-4 py-1.5 bg-[#FF8B7B] rounded-full border-2 border-gray-900 text-sm font-black uppercase text-gray-900 shadow-[2px_2px_0_rgba(0,0,0,1)]">
                  SOAL {room.current_question_index + 1} / {room.question_count}
                </span>
                <span className="text-sm font-black text-gray-700">
                  {participants.length} Siswa Menjawab
                </span>
              </div>

              {/* GIANT QUESTION CARD */}
              <div className="p-8 md:p-12 bg-white rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] text-center">
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-snug [overflow-wrap:anywhere] whitespace-normal">
                  {currentQ.question}
                </h1>
              </div>

              {/* GIANT OPTIONS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                  const optKey = `option_${opt.toLowerCase()}` as keyof GameQuestion;
                  const isCorrect = currentQ.correct_answer === opt;
                  const badgeBg = opt === 'A' ? 'bg-[#FF8B7B]' : opt === 'B' ? 'bg-[#B4D3FF]' : opt === 'C' ? 'bg-[#FFD166]' : 'bg-[#C1F2D0]';

                  return (
                    <div
                      key={opt}
                      className={`p-5 md:p-6 rounded-2xl border-3 border-gray-900 flex items-center justify-between gap-4 shadow-[4px_4px_0_rgba(0,0,0,1)] ${
                        isCorrect ? 'bg-emerald-50 ring-2 ring-emerald-500' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <span className={`w-12 h-12 rounded-xl border-2 border-gray-900 flex items-center justify-center font-black text-xl text-gray-900 flex-shrink-0 ${badgeBg}`}>
                          {opt}
                        </span>
                        <div className="text-lg md:text-2xl font-bold text-gray-900 leading-normal [overflow-wrap:anywhere]">
                          {(currentQ as any)[optKey]}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSetCorrectAnswer(currentQ.id, opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border cursor-pointer transition-all flex-shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-500 text-white border-emerald-700 shadow-xs'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300'
                        }`}
                      >
                        {isCorrect ? '✓ KUNCI BENAR' : 'SET BENAR'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FINISHED PODIUM IN FULLSCREEN */}
          {(room.status === 'finished' || room.status === 'closed') && (
            <div className="max-w-5xl mx-auto w-full space-y-8 text-center">
              <div>
                <span className="inline-block px-4 py-1.5 bg-[#FFD166] rounded-full border-2 border-gray-900 text-xs font-black uppercase mb-2">
                  🏆 HASIL AKHIR KUIS SELESAI
                </span>
                <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight text-gray-900">
                  PAPAN PERINGKAT JUARA
                </h1>
              </div>

              {/* STEPPED PODIUM VIEW FOR TOP 3 */}
              <div className="pt-8 flex flex-col md:flex-row items-end justify-center gap-4 max-w-3xl mx-auto">
                {/* 2nd Place (Left, Medium Step) */}
                <div className="w-full md:w-1/3 flex flex-col items-center order-2 md:order-1">
                  {p2 ? (
                    <div className="w-full space-y-2 text-center animate-fade-in">
                      <div className="text-3xl">🥈</div>
                      <span className="px-3 py-0.5 bg-[#B4D3FF] border border-gray-900 rounded-full text-xs font-black uppercase text-gray-900">
                        JUARA 2
                      </span>
                      <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-900 mx-auto shadow-[2px_2px_0_rgba(0,0,0,1)]">
                        {p2.participant_number}
                      </div>
                      <div className="text-base font-black text-gray-900 truncate px-2" title={p2.participant_name}>
                        {p2.participant_name}
                      </div>
                      <div className="text-lg font-black font-display text-gray-900">
                        {p2.total_score.toLocaleString('id-ID')} <span className="text-xs">PTS</span>
                      </div>
                      {/* Step pillar */}
                      <div className="h-32 md:h-44 w-full bg-[#B4D3FF] border-3 border-gray-900 rounded-t-2xl shadow-[4px_4px_0_rgba(0,0,0,1)] flex items-center justify-center font-black font-display text-4xl text-blue-950">
                        2
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 md:h-44 w-full bg-gray-200 border-2 border-dashed border-gray-400 rounded-t-2xl flex items-center justify-center text-gray-400 font-bold">
                      —
                    </div>
                  )}
                </div>

                {/* 1st Place (Center, Tallest Step) */}
                <div className="w-full md:w-1/3 flex flex-col items-center order-1 md:order-2 -mt-6">
                  {p1 ? (
                    <div className="w-full space-y-2 text-center animate-bounce-short">
                      <div className="text-5xl">🥇</div>
                      <span className="px-4 py-1 bg-[#FFD166] border-2 border-gray-900 rounded-full text-xs font-black uppercase text-gray-900 shadow-[2px_2px_0_rgba(0,0,0,1)]">
                        JUARA 1
                      </span>
                      <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-base text-gray-900 mx-auto shadow-[2px_2px_0_rgba(0,0,0,1)]">
                        {p1.participant_number}
                      </div>
                      <div className="text-lg md:text-xl font-black text-gray-900 truncate px-2" title={p1.participant_name}>
                        {p1.participant_name}
                      </div>
                      <div className="text-2xl font-black font-display text-gray-900">
                        {p1.total_score.toLocaleString('id-ID')} <span className="text-xs">PTS</span>
                      </div>
                      {/* Step pillar */}
                      <div className="h-44 md:h-60 w-full bg-[#FFD166] border-3 border-gray-900 rounded-t-2xl shadow-[5px_5px_0_rgba(0,0,0,1)] flex items-center justify-center font-black font-display text-6xl text-yellow-950">
                        1
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 md:h-60 w-full bg-gray-200 border-2 border-dashed border-gray-400 rounded-t-2xl flex items-center justify-center text-gray-400 font-bold">
                      —
                    </div>
                  )}
                </div>

                {/* 3rd Place (Right, Lowest Step) */}
                <div className="w-full md:w-1/3 flex flex-col items-center order-3">
                  {p3 ? (
                    <div className="w-full space-y-2 text-center animate-fade-in">
                      <div className="text-3xl">🥉</div>
                      <span className="px-3 py-0.5 bg-[#FF8B7B] border border-gray-900 rounded-full text-xs font-black uppercase text-gray-900">
                        JUARA 3
                      </span>
                      <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-900 mx-auto shadow-[2px_2px_0_rgba(0,0,0,1)]">
                        {p3.participant_number}
                      </div>
                      <div className="text-base font-black text-gray-900 truncate px-2" title={p3.participant_name}>
                        {p3.participant_name}
                      </div>
                      <div className="text-lg font-black font-display text-gray-900">
                        {p3.total_score.toLocaleString('id-ID')} <span className="text-xs">PTS</span>
                      </div>
                      {/* Step pillar */}
                      <div className="h-28 md:h-36 w-full bg-[#FF8B7B] border-3 border-gray-900 rounded-t-2xl shadow-[4px_4px_0_rgba(0,0,0,1)] flex items-center justify-center font-black font-display text-4xl text-rose-950">
                        3
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 md:h-36 w-full bg-gray-200 border-2 border-dashed border-gray-400 rounded-t-2xl flex items-center justify-center text-gray-400 font-bold">
                      —
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* HOST FULLSCREEN FOOTER */}
        <div className="text-center text-xs font-bold text-gray-500 flex-shrink-0 pt-2">
          EMKAIN GURU • Interaktif Game Kuis Realtime
        </div>
      </div>
    );
  }

  // =========================================================================
  // NORMAL TEACHER VIEW
  // =========================================================================
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
                {room.status === 'waiting' ? 'LOBBY (RUANG TUNGGU)' :
                 room.status === 'playing' ? 'LIVE (SEDANG BERJALAN)' :
                 room.status === 'finished' ? 'SELESAI' : 'DITUTUP'}
              </span>
            </div>
            <p className="text-xs font-bold text-gray-600 mt-0.5">
              {room.subject} • Kelas {room.class_level} • {room.question_count} Soal • {room.time_per_question}s / Soal
            </p>
          </div>
        </div>

        {/* PIN, CODE & FULLSCREEN BUTTONS */}
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

          {/* FULLSCREEN GAME TOGGLE */}
          <button
            onClick={toggleFullscreen}
            className="px-3.5 py-2 bg-[#FFD166] hover:bg-yellow-300 text-gray-900 border-2 border-gray-900 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            title="Tampilkan ke Projector / TV / Monitor Besar"
          >
            <Maximize2 className="w-4 h-4" />
            <span>FULLSCREEN</span>
          </button>

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
      {/* MODE 1: LOBBY / RUANG TUNGGU */}
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
                RUANG TUNGGU KUIS
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
                <span>DAFTAR PESERTA DI RUANG TUNGGU ({participants.length})</span>
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
                    className={`p-3.5 rounded-xl border-2 border-gray-900 flex items-start justify-between gap-3 ${
                      isCorrect ? 'bg-emerald-50 border-emerald-600 shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`w-8 h-8 rounded-lg border-2 border-gray-900 flex items-center justify-center font-black text-xs text-gray-900 flex-shrink-0 ${badgeBg}`}>
                        {opt}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs md:text-sm font-bold text-gray-900 leading-normal [overflow-wrap:anywhere]">
                          {(currentQ as any)[optKey]}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSetCorrectAnswer(currentQ.id, opt)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border cursor-pointer transition-all flex-shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-500 text-white border-emerald-700 shadow-xs'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300'
                      }`}
                    >
                      {isCorrect ? '✓ KUNCI BENAR' : 'SET BENAR'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* TEACHER ADVANCE CONTROL */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200">
              <div className="text-xs font-bold text-gray-600">
                {secondsLeft === 0 ? 'WAKTU SOAL HABIS (Otomatis pindah / manual)' : 'Kuis sedang berlangsung...'}
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

            {/* TOP 3 STEPPED PODIUM DISPLAY */}
            <div className="pt-6 flex flex-col md:flex-row items-end justify-center gap-4 max-w-2xl mx-auto">
              {/* 2nd Place */}
              <div className="w-full md:w-1/3 flex flex-col items-center order-2 md:order-1">
                {p2 ? (
                  <div className="w-full space-y-1.5 text-center">
                    <div className="text-2xl">🥈</div>
                    <span className="px-2.5 py-0.5 bg-[#B4D3FF] border border-gray-900 rounded-full text-[10px] font-black uppercase text-gray-900">
                      JUARA 2
                    </span>
                    <div className="w-9 h-9 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-xs text-gray-900 mx-auto">
                      {p2.participant_number}
                    </div>
                    <div className="text-xs font-black text-gray-900 truncate" title={p2.participant_name}>
                      {p2.participant_name}
                    </div>
                    <div className="text-sm font-black font-display text-gray-900">
                      {p2.total_score.toLocaleString('id-ID')} PTS
                    </div>
                    <div className="h-24 md:h-32 w-full bg-[#B4D3FF] border-2 border-gray-900 rounded-t-xl shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-center font-black font-display text-2xl text-blue-950">
                      2
                    </div>
                  </div>
                ) : (
                  <div className="h-24 md:h-32 w-full bg-gray-100 border border-dashed border-gray-300 rounded-t-xl flex items-center justify-center text-gray-400 text-xs">
                    —
                  </div>
                )}
              </div>

              {/* 1st Place */}
              <div className="w-full md:w-1/3 flex flex-col items-center order-1 md:order-2 -mt-4">
                {p1 ? (
                  <div className="w-full space-y-1.5 text-center">
                    <div className="text-3xl">🥇</div>
                    <span className="px-3 py-0.5 bg-[#FFD166] border border-gray-900 rounded-full text-[10px] font-black uppercase text-gray-900">
                      JUARA 1
                    </span>
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-xs text-gray-900 mx-auto">
                      {p1.participant_number}
                    </div>
                    <div className="text-xs font-black text-gray-900 truncate" title={p1.participant_name}>
                      {p1.participant_name}
                    </div>
                    <div className="text-base font-black font-display text-gray-900">
                      {p1.total_score.toLocaleString('id-ID')} PTS
                    </div>
                    <div className="h-32 md:h-44 w-full bg-[#FFD166] border-2 border-gray-900 rounded-t-xl shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-center font-black font-display text-4xl text-yellow-950">
                      1
                    </div>
                  </div>
                ) : (
                  <div className="h-32 md:h-44 w-full bg-gray-100 border border-dashed border-gray-300 rounded-t-xl flex items-center justify-center text-gray-400 text-xs">
                    —
                  </div>
                )}
              </div>

              {/* 3rd Place */}
              <div className="w-full md:w-1/3 flex flex-col items-center order-3">
                {p3 ? (
                  <div className="w-full space-y-1.5 text-center">
                    <div className="text-2xl">🥉</div>
                    <span className="px-2.5 py-0.5 bg-[#FF8B7B] border border-gray-900 rounded-full text-[10px] font-black uppercase text-gray-900">
                      JUARA 3
                    </span>
                    <div className="w-9 h-9 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-xs text-gray-900 mx-auto">
                      {p3.participant_number}
                    </div>
                    <div className="text-xs font-black text-gray-900 truncate" title={p3.participant_name}>
                      {p3.participant_name}
                    </div>
                    <div className="text-sm font-black font-display text-gray-900">
                      {p3.total_score.toLocaleString('id-ID')} PTS
                    </div>
                    <div className="h-20 md:h-24 w-full bg-[#FF8B7B] border-2 border-gray-900 rounded-t-xl shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-center font-black font-display text-2xl text-rose-950">
                      3
                    </div>
                  </div>
                ) : (
                  <div className="h-20 md:h-24 w-full bg-gray-100 border border-dashed border-gray-300 rounded-t-xl flex items-center justify-center text-gray-400 text-xs">
                    —
                  </div>
                )}
              </div>
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
                PAPAN PERINGKAT JUARA
              </h3>
              <p className="text-xs md:text-sm font-bold text-gray-600 mt-1">
                Selamat kepada seluruh peserta atas partisipasinya dalam kuis {room.title}
              </p>
            </div>

            {/* STEPPED PODIUM FOR TOP 3 */}
            <div className="pt-8 flex flex-col md:flex-row items-end justify-center gap-4 max-w-2xl mx-auto">
              {/* 2nd Place */}
              <div className="w-full md:w-1/3 flex flex-col items-center order-2 md:order-1">
                {p2 ? (
                  <div className="w-full space-y-2 text-center">
                    <div className="text-3xl">🥈</div>
                    <span className="px-3 py-0.5 bg-[#B4D3FF] border border-gray-900 rounded-full text-xs font-black uppercase text-gray-900">
                      JUARA 2
                    </span>
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-900 mx-auto shadow-[2px_2px_0_rgba(0,0,0,1)]">
                      {p2.participant_number}
                    </div>
                    <div className="text-sm font-black text-gray-900 truncate px-2" title={p2.participant_name}>
                      {p2.participant_name}
                    </div>
                    <div className="text-lg font-black font-display text-gray-900">
                      {p2.total_score.toLocaleString('id-ID')} <span className="text-xs">PTS</span>
                    </div>
                    {/* Step pillar */}
                    <div className="h-32 md:h-40 w-full bg-[#B4D3FF] border-3 border-gray-900 rounded-t-2xl shadow-[4px_4px_0_rgba(0,0,0,1)] flex items-center justify-center font-black font-display text-4xl text-blue-950">
                      2
                    </div>
                  </div>
                ) : (
                  <div className="h-32 md:h-40 w-full bg-gray-200 border-2 border-dashed border-gray-400 rounded-t-2xl flex items-center justify-center text-gray-400 font-bold">
                    —
                  </div>
                )}
              </div>

              {/* 1st Place */}
              <div className="w-full md:w-1/3 flex flex-col items-center order-1 md:order-2 -mt-6">
                {p1 ? (
                  <div className="w-full space-y-2 text-center">
                    <div className="text-5xl animate-bounce-short">🥇</div>
                    <span className="px-4 py-1 bg-[#FFD166] border-2 border-gray-900 rounded-full text-xs font-black uppercase text-gray-900 shadow-[2px_2px_0_rgba(0,0,0,1)]">
                      JUARA 1
                    </span>
                    <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-base text-gray-900 mx-auto shadow-[2px_2px_0_rgba(0,0,0,1)]">
                      {p1.participant_number}
                    </div>
                    <div className="text-base md:text-lg font-black text-gray-900 truncate px-2" title={p1.participant_name}>
                      {p1.participant_name}
                    </div>
                    <div className="text-2xl font-black font-display text-gray-900">
                      {p1.total_score.toLocaleString('id-ID')} <span className="text-xs">PTS</span>
                    </div>
                    {/* Step pillar */}
                    <div className="h-44 md:h-56 w-full bg-[#FFD166] border-3 border-gray-900 rounded-t-2xl shadow-[5px_5px_0_rgba(0,0,0,1)] flex items-center justify-center font-black font-display text-6xl text-yellow-950">
                      1
                    </div>
                  </div>
                ) : (
                  <div className="h-44 md:h-56 w-full bg-gray-200 border-2 border-dashed border-gray-400 rounded-t-2xl flex items-center justify-center text-gray-400 font-bold">
                    —
                  </div>
                )}
              </div>

              {/* 3rd Place */}
              <div className="w-full md:w-1/3 flex flex-col items-center order-3">
                {p3 ? (
                  <div className="w-full space-y-2 text-center">
                    <div className="text-3xl">🥉</div>
                    <span className="px-3 py-0.5 bg-[#FF8B7B] border border-gray-900 rounded-full text-xs font-black uppercase text-gray-900">
                      JUARA 3
                    </span>
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-900 mx-auto shadow-[2px_2px_0_rgba(0,0,0,1)]">
                      {p3.participant_number}
                    </div>
                    <div className="text-sm font-black text-gray-900 truncate px-2" title={p3.participant_name}>
                      {p3.participant_name}
                    </div>
                    <div className="text-lg font-black font-display text-gray-900">
                      {p3.total_score.toLocaleString('id-ID')} <span className="text-xs">PTS</span>
                    </div>
                    {/* Step pillar */}
                    <div className="h-28 md:h-32 w-full bg-[#FF8B7B] border-3 border-gray-900 rounded-t-2xl shadow-[4px_4px_0_rgba(0,0,0,1)] flex items-center justify-center font-black font-display text-4xl text-rose-950">
                      3
                    </div>
                  </div>
                ) : (
                  <div className="h-28 md:h-32 w-full bg-gray-200 border-2 border-dashed border-gray-400 rounded-t-2xl flex items-center justify-center text-gray-400 font-bold">
                    —
                  </div>
                )}
              </div>
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
