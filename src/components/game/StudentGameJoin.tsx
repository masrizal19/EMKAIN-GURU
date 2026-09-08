/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Clock, CheckCircle2, XCircle, Trophy, Users, 
  Sparkles, AlertCircle, BarChart3, Award
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  submitGameAnswerApi, 
  getStoredParticipant,
  setStoredParticipant,
  clearStoredParticipant
} from '../../lib/game_store';
import { GameRoom, GameQuestion, GameParticipant } from '../../types';

interface StudentGameJoinProps {
  initialRoomCode?: string;
  onExit?: () => void;
  currentUserId?: string;
  currentUserName?: string;
}

export const StudentGameJoin: React.FC<StudentGameJoinProps> = ({
  initialRoomCode = '',
  onExit,
  currentUserId,
  currentUserName
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [pin, setPin] = useState('');
  const [participantName, setParticipantName] = useState(currentUserName || '');
  
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [participant, setParticipant] = useState<GameParticipant | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active question state
  const [activeQuestion, setActiveQuestion] = useState<GameQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [answerResult, setAnswerResult] = useState<{
    is_correct?: boolean;
    score?: number;
    correct_answer?: 'A' | 'B' | 'C' | 'D';
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [leaderboard, setLeaderboard] = useState<GameParticipant[]>([]);

  const lastKnownOrderRef = useRef<number>(0);
  const lastKnownStatusRef = useRef<string>('waiting');
  const questionStartTimeRef = useRef<number>(Date.now());

  // Populate room code from URL parameter or prop without auto-joining
  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.trim().toUpperCase());
    }
  }, [initialRoomCode]);

  // Load Leaderboard helper
  const loadLeaderboard = async (gId: string) => {
    try {
      const { data, error: lbErr } = await supabase.rpc('get_game_leaderboard', {
        p_game_id: gId
      });
      if (lbErr) {
        console.error('[GAME LEADERBOARD ERROR]', lbErr);
        return;
      }
      if (data) {
        const formattedLb: GameParticipant[] = data.map((p: any) => ({
          id: p.participant_id,
          game_id: gId,
          participant_name: p.participant_name,
          participant_number: String(p.participant_number).padStart(2, '0'),
          total_score: p.total_score || 0,
          correct_count: p.correct_count || 0,
          wrong_count: p.wrong_count || 0,
          unanswered_count: 0
        }));
        setLeaderboard(formattedLb);
      }
    } catch (err) {
      console.error('[GAME LEADERBOARD ERROR]', err);
    }
  };

  // Central loadGameState function calling get_game_state RPC
  const loadGameState = async (targetGameId?: string, targetPartId?: string, targetToken?: string) => {
    const gId = targetGameId || room?.id;
    const pId = targetPartId || participant?.id;
    const sToken = targetToken || participant?.session_token;

    if (!gId || !pId || !sToken) return;

    try {
      const { data, error: stateErr } = await supabase.rpc('get_game_state', {
        p_game_id: gId,
        p_participant_id: pId,
        p_session_token: sToken
      });

      if (stateErr) {
        console.error('[GAME STATE ERROR]', stateErr);
        setError(stateErr.message);
        return;
      }

      if (!data || !data.success) {
        return;
      }

      const gData = data.game;
      const pData = data.participant;
      const qData = data.question;

      if (gData) {
        const prevOrder = lastKnownOrderRef.current;
        const newOrder = gData.current_question_order || 0;
        const prevStatus = lastKnownStatusRef.current;
        const newStatus = gData.status;

        lastKnownOrderRef.current = newOrder;
        lastKnownStatusRef.current = newStatus;

        setRoom((prev) => ({
          id: gData.id,
          title: gData.title,
          subject: gData.subject,
          class_level: gData.class_name || '',
          class_name: gData.class_name || '',
          pin: prev?.pin || '',
          room_code: gData.room_code,
          status: newStatus,
          current_question_index: Math.max(0, newOrder - 1),
          question_count: gData.question_count || 0,
          time_per_question: gData.time_per_question || 20,
          question_start_time: gData.question_started_at || null,
          created_at: prev?.created_at || new Date().toISOString()
        }));

        // Reset user choice when new question starts or status changes
        if (newOrder !== prevOrder || newStatus !== prevStatus) {
          setSelectedOption(null);
          setIsLocked(false);
          setAnswerResult(null);
          questionStartTimeRef.current = Date.now();
        }
      }

      if (pData) {
        setParticipant((prev) => ({
          id: pData.id,
          game_id: gData?.id || prev?.game_id || gId,
          participant_name: pData.participant_name,
          participant_number: String(pData.participant_number).padStart(2, '0'),
          session_token: sToken,
          total_score: pData.total_score || 0,
          correct_count: pData.correct_count || 0,
          wrong_count: pData.wrong_count || 0,
          unanswered_count: pData.unanswered_count || 0
        }));
      }

      if (qData) {
        setActiveQuestion(qData);
      }

      if (gData?.status === 'finished') {
        loadLeaderboard(gId);
      }
    } catch (err: any) {
      console.error('[GAME ERROR]', err);
      setError(err?.message || 'Terjadi kesalahan pada Game');
    }
  };

  // Restore session on mount if student refreshes page
  useEffect(() => {
    const code = (initialRoomCode || roomCode || '').trim().toUpperCase();
    const saved = (code ? localStorage.getItem(`emkain_active_game_${code}`) : null) || localStorage.getItem('emkain_active_game_last');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.gameId && parsed.participantId && parsed.sessionToken) {
          loadGameState(parsed.gameId, parsed.participantId, parsed.sessionToken);
        }
      } catch (e) {
        console.error('[RESTORE GAME SESSION ERROR]', e);
      }
    }
  }, [initialRoomCode]);

  // Supabase Realtime subscription specifically for this game room
  useEffect(() => {
    if (!room?.id || !participant?.id || !participant?.session_token) return;

    const channel = supabase
      .channel(`game_room_student_${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${room.id}`
        },
        (payload: any) => {
          console.log('[GAME REALTIME ROOM UPDATE]', payload);
          if (payload.new) {
            const updated = payload.new;
            if (
              updated.status === 'playing' ||
              updated.status === 'finished' ||
              (updated.current_question_order !== undefined && updated.current_question_order !== lastKnownOrderRef.current) ||
              updated.status !== lastKnownStatusRef.current
            ) {
              loadGameState(room.id, participant.id, participant.session_token);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          filter: `id=eq.${participant.id}`
        },
        (payload: any) => {
          if (payload.new) {
            const updated = payload.new;
            setParticipant((prev) =>
              prev
                ? {
                    ...prev,
                    total_score: updated.total_score !== undefined ? updated.total_score : prev.total_score,
                    correct_count: updated.correct_count !== undefined ? updated.correct_count : prev.correct_count,
                    wrong_count: updated.wrong_count !== undefined ? updated.wrong_count : prev.wrong_count,
                    unanswered_count: updated.unanswered_count !== undefined ? updated.unanswered_count : prev.unanswered_count
                  }
                : null
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, participant?.id, participant?.session_token]);

  // Fallback polling: if status is 'waiting', check state every 1 second
  useEffect(() => {
    if (!room?.id || !participant?.id || room.status !== 'waiting') return;

    const interval = setInterval(async () => {
      try {
        const { data: rData } = await supabase
          .from('game_rooms')
          .select('status, current_question_order')
          .eq('id', room.id)
          .maybeSingle();

        if (rData && (rData.status === 'playing' || rData.status === 'finished')) {
          clearInterval(interval);
          loadGameState(room.id, participant.id, participant.session_token);
        }
      } catch {
        // silent
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.id, room?.status, participant?.id, participant?.session_token]);

  // Periodic leaderboard sync if playing or finished
  useEffect(() => {
    if (!room?.id || !participant?.id) return;
    if (room.status !== 'playing' && room.status !== 'finished') return;

    const interval = setInterval(() => {
      loadLeaderboard(room.id);
    }, 3000);

    return () => clearInterval(interval);
  }, [room?.id, room?.status, participant?.id]);

  // Countdown timer for active question based on database question_start_time
  useEffect(() => {
    if (!room || room.status !== 'playing' || !room.question_start_time) return;

    const startMs = new Date(room.question_start_time).getTime();
    const durationSec = room.time_per_question || 20;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      const remaining = Math.max(0, durationSec - elapsed);
      setSecondsLeft(remaining);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [room?.status, room?.current_question_index, room?.question_start_time, room?.time_per_question]);

  // Join Room Handler via Supabase RPC
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const roomCodeClean = roomCode.trim().toUpperCase();
    const pinClean = pin.trim();
    const participantNameClean = participantName.trim();

    if (!roomCodeClean) {
      setError('Kode Room wajib diisi');
      return;
    }

    if (!pinClean) {
      setError('PIN Game wajib diisi');
      return;
    }

    if (!/^\d{4,6}$/.test(pinClean)) {
      setError('PIN Game harus berupa angka');
      return;
    }

    if (!participantNameClean) {
      setError('Nama Anda wajib diisi');
      return;
    }

    // Session token per room for persistent participant number
    const storageKey = `emkain_game_session_${roomCodeClean}`;
    let sessionToken = localStorage.getItem(storageKey);
    if (!sessionToken) {
      sessionToken = crypto.randomUUID();
      localStorage.setItem(storageKey, sessionToken);
    }

    setLoading(true);

    try {
      console.log('[GAME JOIN REQUEST]', {
        roomCode: roomCodeClean,
        pin: pinClean,
        participantName: participantNameClean,
        sessionToken
      });

      const { data, error: rpcError } = await supabase.rpc(
        'join_game_room',
        {
          p_room_code: roomCodeClean,
          p_pin: pinClean,
          p_name: participantNameClean,
          p_session_token: sessionToken
        }
      );

      if (rpcError) {
        console.error('[GAME JOIN ERROR]', rpcError);
        setError(rpcError.message || 'Gagal masuk ke Game Room');
        return;
      }

      const participantData = data?.participant;
      const gameData = data?.game;

      if (!data?.success || !participantData || !gameData) {
        console.error('[GAME JOIN INVALID RESPONSE]', data);
        setError('Data Game Room tidak lengkap dari Supabase.');
        return;
      }

      const effectiveToken = participantData.session_token || sessionToken;
      localStorage.setItem(storageKey, effectiveToken);

      // Save for refresh recovery
      localStorage.setItem(`emkain_active_game_${roomCodeClean}`, JSON.stringify({
        gameId: gameData.id,
        participantId: participantData.id,
        sessionToken: effectiveToken,
        roomCode: roomCodeClean
      }));
      localStorage.setItem('emkain_active_game_last', JSON.stringify({
        gameId: gameData.id,
        participantId: participantData.id,
        sessionToken: effectiveToken,
        roomCode: roomCodeClean
      }));

      // Immediately fetch latest game state
      await loadGameState(gameData.id, participantData.id, effectiveToken);

    } catch (err: any) {
      console.error('[GAME JOIN ERROR]', err);
      setError(err.message || 'Gagal masuk ke Game Room');
    } finally {
      setLoading(false);
    }
  };

  // Submit Answer Handler via Supabase RPC
  const handleSelectAnswer = async (option: 'A' | 'B' | 'C' | 'D') => {
    if (isLocked || !room || !participant || secondsLeft <= 0) return;

    setSelectedOption(option);
    setIsLocked(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('submit_game_answer', {
        p_game_id: room.id,
        p_participant_id: participant.id,
        p_session_token: participant.session_token,
        p_answer: option
      });

      if (rpcError) {
        console.error('[GAME RPC ERROR]', rpcError);
        setError(rpcError.message);
        return;
      }

      if (data) {
        setAnswerResult({
          is_correct: data.is_correct,
          score: data.score,
          correct_answer: data.correct_answer
        });

        if (data.score && data.score > 0) {
          setParticipant((prev) =>
            prev ? { ...prev, total_score: (prev.total_score || 0) + data.score } : null
          );
        }
      }
    } catch (err: any) {
      console.error('[GAME ERROR]', err);
      setError(err?.message || 'Terjadi kesalahan pada Game');
    }
  };

  const handleExitRoom = () => {
    if (room) {
      localStorage.removeItem(`emkain_active_game_${room.room_code}`);
      clearStoredParticipant(room.room_code);
    }
    localStorage.removeItem('emkain_active_game_last');
    setParticipant(null);
    setRoom(null);
    setActiveQuestion(null);
    if (onExit) onExit();
  };

  // =========================================================================
  // VIEW 1: JOIN FORM (Not yet in room)
  // =========================================================================
  if (!participant || !room) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-3 md:p-6 font-body">
        <div className="w-full max-w-md bg-[#FAF6F0] rounded-2xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] p-6 md:p-8 space-y-6">
          
          {/* LOGO & TITLE */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFD166] border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] text-3xl mx-auto">
              🎮
            </div>
            <h2 className="text-2xl font-black font-display uppercase tracking-tight text-gray-900 leading-none">
              MASUK KE GAME KUIS
            </h2>
            <p className="text-xs font-bold text-gray-600">
              Ketikkan Nama Anda dan PIN dari Guru untuk mulai bermain
            </p>
          </div>

          {/* ROOM PREVIEW CARD IF AVAILABLE */}
          {room && (
            <div className="p-3.5 bg-white rounded-xl border-2 border-gray-900 shadow-[2px_2px_0_rgba(0,0,0,1)] text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 block">
                GAME DITEMUKAN
              </span>
              <div className="text-sm font-black text-gray-900 font-display">
                {room.title}
              </div>
              <div className="text-xs font-bold text-gray-500 mt-0.5">
                {room.subject} • {room.class_level} • {room.question_count} Soal
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-100 border-2 border-red-600 rounded-xl text-red-900 text-xs font-black flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            
            {/* KODE ROOM INPUT */}
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-gray-900">
                KODE ROOM
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Contoh: GAME-8K29"
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border-2 border-gray-900 text-sm font-black tracking-wider text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-yellow-400 uppercase font-mono"
                required
              />
            </div>

            {/* PIN GAME INPUT */}
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-gray-900">
                PIN GAME
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="6 Digit PIN (contoh: 583214)"
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border-2 border-gray-900 text-sm font-black tracking-widest text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-yellow-400 font-mono"
                required
              />
            </div>

            {/* NAMA ANDA INPUT */}
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-gray-900">
                NAMA ANDA
              </label>
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Ketikkan Nama Lengkap / Panggilan Anda"
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border-2 border-gray-900 text-sm font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-yellow-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-[#C1F2D0] hover:bg-emerald-300 disabled:opacity-50 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              {loading ? 'MEMVERIFIKASI...' : 'MASUK KE ROOM GAME'}
            </button>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="w-full py-2.5 text-center text-xs font-bold text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                Kembali ke Menu Utama
              </button>
            )}

          </form>

        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOBBY WAITING (Student in room waiting for teacher to start)
  // =========================================================================
  if (room.status === 'waiting') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-3 md:p-6 font-body">
        <div className="w-full max-w-md bg-white rounded-2xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] p-6 md:p-8 text-center space-y-6">
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFD166] border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] text-3xl mx-auto animate-bounce">
            ⏳
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">
              BERHASIL BERGABUNG
            </span>
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-gray-900">
              MENUNGGU GURU MEMULAI GAME...
            </h2>
            <p className="text-xs font-bold text-gray-600">
              Harap jangan menutup halaman ini. Soal kuis akan muncul otomatis saat kuis dimulai oleh Guru.
            </p>
          </div>

          {/* PARTICIPANT BADGE */}
          <div className="p-4 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#B4D3FF] border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-900 font-mono">
              {String(participant.participant_number).padStart(2, '0')}
            </span>
            <div className="text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">
                NOMOR PESERTA ANDA
              </span>
              <div className="text-sm font-black text-gray-900 font-display">
                {String(participant.participant_number).padStart(2, '0')} {participant.participant_name}
              </div>
            </div>
          </div>

          {/* ROOM INFO */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 space-y-1">
            <div><span className="text-gray-400">Judul:</span> {room.title}</div>
            <div><span className="text-gray-400">Mapel:</span> {room.subject} ({room.class_level})</div>
            <div><span className="text-gray-400">Jumlah Soal:</span> {room.question_count} Soal ({room.time_per_question}s / soal)</div>
          </div>

          <button
            onClick={handleExitRoom}
            className="py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-600 cursor-pointer"
          >
            Keluar dari Room
          </button>

        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ACTIVE QUESTION SCREEN (Live Answering for Student)
  // =========================================================================
  const currentQ = activeQuestion || questions[room.current_question_index];
  const maxScore = Math.max(...leaderboard.map(p => p.total_score || 0), 1000);

  if (room.status === 'playing' && !currentQ) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-3 md:p-6 font-body">
        <div className="w-full max-w-md bg-white rounded-2xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] p-6 md:p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFD166] border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] text-3xl mx-auto animate-bounce">
            ⚡
          </div>
          <h2 className="text-xl font-black font-display uppercase tracking-tight text-gray-900">
            MEMPERSIAPKAN SOAL...
          </h2>
          <p className="text-xs font-bold text-gray-600">
            Sedang memuat soal kuis dari server...
          </p>
        </div>
      </div>
    );
  }

  if (room.status === 'playing' && currentQ) {
    return (
      <div className="max-w-2xl mx-auto p-3 md:p-6 space-y-5 font-body pb-12">
        
        {/* STUDENT TOP BAR */}
        <div className="p-4 bg-white rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#FFD166] border border-gray-900 flex items-center justify-center font-black text-xs text-gray-900 font-mono">
              {String(participant.participant_number).padStart(2, '0')}
            </span>
            <div className="truncate">
              <span className="text-xs font-black text-gray-900 block truncate">
                {String(participant.participant_number).padStart(2, '0')} {participant.participant_name}
              </span>
              <span className="text-[10px] font-bold text-emerald-600">
                {(participant.total_score || 0).toLocaleString('id-ID')} POIN
              </span>
            </div>
          </div>

          {/* TIMER */}
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-gray-900 font-display font-black text-base ${
            secondsLeft <= 5 ? 'bg-red-500 text-white animate-bounce' : 'bg-[#FFD166] text-gray-900'
          }`}>
            <Clock className="w-4 h-4" />
            <span>00:{String(secondsLeft).padStart(2, '0')}</span>
          </div>
        </div>

        {/* QUESTION CARD */}
        <div className="p-5 md:p-7 bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] space-y-4">
          
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-[#FF8B7B] rounded-full border-2 border-gray-900 text-xs font-black uppercase text-gray-900">
              SOAL {currentQ.question_order !== undefined ? currentQ.question_order : (room.current_question_index + 1)} DARI {room.question_count}
            </span>
            <span className="text-xs font-bold text-gray-400">
              {room.time_per_question} Detik
            </span>
          </div>

          {/* QUESTION TEXT */}
          <div className="py-2">
            <h3 className="text-base md:text-lg font-black text-gray-900 leading-relaxed [overflow-wrap:anywhere] whitespace-normal">
              {currentQ.question}
            </h3>
          </div>

          {/* 4 LARGE OPTION BUTTONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {(['A', 'B', 'C', 'D'] as const).map((opt) => {
              const optKey = `option_${opt.toLowerCase()}` as keyof GameQuestion;
              const isPicked = selectedOption === opt;
              const disabled = isLocked || secondsLeft <= 0;

              const badgeColors: Record<string, string> = {
                A: 'bg-[#FF8B7B]',
                B: 'bg-[#B4D3FF]',
                C: 'bg-[#FFD166]',
                D: 'bg-[#C1F2D0]'
              };

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectAnswer(opt)}
                  className={`p-4 rounded-xl border-2 border-gray-900 text-left cursor-pointer transition-all flex items-start gap-3 ${
                    isPicked
                      ? 'bg-amber-100 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] translate-x-0.5 translate-y-0.5'
                      : disabled
                      ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50 hover:shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg border-2 border-gray-900 flex items-center justify-center font-black text-xs text-gray-900 flex-shrink-0 ${badgeColors[opt]}`}>
                    {opt}
                  </span>
                  <div className="text-xs md:text-sm font-bold text-gray-900 leading-normal [overflow-wrap:anywhere] pt-1">
                    {(currentQ as any)[optKey]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ANSWER STATUS / RESULT BANNER */}
          {isLocked && secondsLeft > 0 && (
            <div className="p-3.5 bg-blue-50 border-2 border-blue-400 rounded-xl text-center space-y-1 animate-pulse">
              <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                🔒 JAWABAN TERKUNCI ({selectedOption})
              </span>
              <p className="text-[11px] font-bold text-blue-700">
                Menunggu waktu soal berakhir untuk melihat hasil dan peringkat...
              </p>
            </div>
          )}

          {/* TIME OVER / QUESTION RESULT */}
          {secondsLeft === 0 && (
            <div className="p-4 rounded-xl border-2 border-gray-900 text-center space-y-2">
              {answerResult?.is_correct ? (
                <div className="p-3 bg-[#C1F2D0] border-2 border-emerald-600 rounded-lg space-y-1">
                  <div className="text-sm font-black uppercase text-emerald-900 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    <span>JAWABAN ANDA BENAR!</span>
                  </div>
                  <div className="text-lg font-black font-display text-emerald-800">
                    +{answerResult.score} POIN
                  </div>
                </div>
              ) : selectedOption ? (
                <div className="p-3 bg-red-100 border-2 border-red-500 rounded-lg space-y-1">
                  <div className="text-sm font-black uppercase text-red-900 flex items-center justify-center gap-1.5">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>JAWABAN ANDA KURANG TEPAT</span>
                  </div>
                  <div className="text-xs font-bold text-red-700">
                    +0 Poin. Jawaban benar: {answerResult?.correct_answer || '...'}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-100 border-2 border-amber-500 rounded-lg text-amber-900 font-bold text-xs">
                  Waktu Habis! Anda belum sempat memilih jawaban.
                </div>
              )}

              <div className="text-xs font-bold text-gray-500 pt-1">
                Menunggu Guru melanjutkan ke soal berikutnya...
              </div>
            </div>
          )}

        </div>

        {/* REALTIME TOP 3 LEADERBOARD */}
        <div className="p-5 bg-white rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>PERINGKAT TERATAS (TOP 3)</span>
            </span>
            <span className="text-[11px] font-bold text-gray-400">
              Total Skor Anda: {(participant.total_score || 0).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {leaderboard.slice(0, 3).map((p, idx) => (
              <div
                key={p.id}
                className={`p-2.5 rounded-xl border border-gray-900 ${
                  p.id === participant.id ? 'bg-[#FFD166] font-black' : 'bg-[#FAF6F0]'
                }`}
              >
                <div className="text-[10px] font-black uppercase text-gray-500">
                  #{idx + 1}
                </div>
                <div className="text-xs font-black text-gray-900 truncate" title={p.participant_name}>
                  {p.participant_name}
                </div>
                <div className="text-xs font-black text-emerald-700 mt-0.5">
                  {(p.total_score || 0).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  // =========================================================================
  // VIEW 4: GAME FINISHED SCREEN (Final Podium & Student Result)
  // =========================================================================
  const myRank = leaderboard.findIndex(p => p.id === participant.id) + 1;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-3 md:p-6 font-body">
      <div className="w-full max-w-lg bg-white rounded-2xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] p-6 md:p-8 text-center space-y-6">
        
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFD166] border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] text-3xl mx-auto">
          🏆
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">
            GAME KUIS SELESAI
          </span>
          <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-gray-900">
            TERIMA KASIH TELAH BERMAIN!
          </h2>
          <p className="text-xs font-bold text-gray-600">
            {room.title}
          </p>
        </div>

        {/* PERSONAL RESULT CARD */}
        <div className="p-5 bg-[#FAF6F0] rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] space-y-2 text-center">
          <div className="text-xs font-black uppercase tracking-wider text-gray-500">
            HASIL AKHIR ANDA:
          </div>
          <div className="text-3xl font-black font-display text-gray-900">
            {(participant.total_score || 0).toLocaleString('id-ID')} <span className="text-sm font-bold text-gray-500">POIN</span>
          </div>
          {myRank > 0 && (
            <div className="inline-block px-3 py-1 bg-[#FFD166] rounded-full border border-gray-900 text-xs font-black uppercase text-gray-900">
              Peringkat #{myRank} dari {leaderboard.length} Peserta
            </div>
          )}
        </div>

        {/* TOP 3 PODIUM */}
        <div className="space-y-3">
          <div className="text-xs font-black uppercase tracking-wider text-gray-800 text-left">
            JUARA 1, 2, DAN 3:
          </div>
          <div className="grid grid-cols-3 gap-2">
            {leaderboard.slice(0, 3).map((p, idx) => {
              const podiumBgs = ['bg-[#FFD166]', 'bg-[#B4D3FF]', 'bg-[#FF8B7B]'];
              const medals = ['🥇 1', '🥈 2', '🥉 3'];
              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0_rgba(0,0,0,1)] text-center space-y-1 ${podiumBgs[idx] || 'bg-white'}`}
                >
                  <span className="text-xs font-black">{medals[idx]}</span>
                  <div className="text-xs font-black text-gray-900 truncate" title={p.participant_name}>
                    {p.participant_name}
                  </div>
                  <div className="text-xs font-black text-gray-900 font-display">
                    {(p.total_score || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleExitRoom}
          className="w-full py-3.5 px-6 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)]"
        >
          SELESAI & KELUAR DARI ROOM
        </button>

      </div>
    </div>
  );
};

