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
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [answerResult, setAnswerResult] = useState<{
    is_correct?: boolean;
    score?: number;
    correct_answer?: 'A' | 'B' | 'C' | 'D';
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [leaderboard, setLeaderboard] = useState<GameParticipant[]>([]);

  const pollIntervalRef = useRef<any>(null);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Populate room code from URL parameter or prop without auto-joining
  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.trim().toUpperCase());
    }
  }, [initialRoomCode]);

  // Optional room preview directly from Supabase (without auto-joining)
  useEffect(() => {
    if (!roomCode || roomCode.trim().length < 4 || participant) return;
    const fetchPreview = async () => {
      try {
        const { data: roomData } = await supabase
          .from('game_rooms')
          .select('id, title, subject, class_level, class_name, room_code, question_count')
          .eq('room_code', roomCode.trim().toUpperCase())
          .maybeSingle();

        if (roomData && !participant) {
          setRoom(prev => prev && prev.id === roomData.id ? prev : ({
            id: roomData.id,
            title: roomData.title,
            subject: roomData.subject,
            class_level: roomData.class_name || roomData.class_level || '',
            class_name: roomData.class_name || roomData.class_level || '',
            room_code: roomData.room_code,
            pin: '',
            status: 'waiting',
            current_question_index: 0,
            question_count: roomData.question_count || 0,
            time_per_question: 20
          } as GameRoom));
        }
      } catch {
        // silent preview catch
      }
    };
    fetchPreview();
  }, [roomCode, participant]);

  // Supabase Realtime subscription specifically for this game room
  useEffect(() => {
    if (!room?.id || !participant?.id) return;

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
            setRoom((prev) => {
              if (!prev) return null;
              const newIndex = updated.current_question_order !== undefined
                ? updated.current_question_order
                : (updated.current_question_index !== undefined ? updated.current_question_index : prev.current_question_index);

              if (newIndex !== prev.current_question_index || updated.status !== prev.status) {
                setSelectedOption(null);
                setIsLocked(false);
                setAnswerResult(null);
                questionStartTimeRef.current = Date.now();
              }

              return {
                ...prev,
                status: updated.status || prev.status,
                current_question_index: newIndex,
                question_start_time: updated.question_started_at || updated.question_start_time || prev.question_start_time,
                time_per_question: updated.time_per_question || prev.time_per_question
              };
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          filter: `game_id=eq.${room.id}`
        },
        (payload: any) => {
          console.log('[GAME REALTIME PARTICIPANT UPDATE]', payload);
          if (payload.new) {
            const updated = payload.new;
            if (updated.id === participant.id) {
              setParticipant((prev) =>
                prev
                  ? {
                      ...prev,
                      total_score: updated.total_score !== undefined ? updated.total_score : prev.total_score,
                      correct_count: updated.correct_count !== undefined ? updated.correct_count : prev.correct_count,
                      wrong_count: updated.wrong_count !== undefined ? updated.wrong_count : prev.wrong_count,
                      unanswered_count: updated.unanswered_count !== undefined ? updated.unanswered_count : prev.unanswered_count,
                      participant_number: updated.participant_number
                        ? String(updated.participant_number).padStart(2, '0')
                        : prev.participant_number
                    }
                  : null
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, participant?.id]);

  // Periodic state and leaderboard sync directly from Supabase
  useEffect(() => {
    if (!room?.id || !participant?.id) return;

    const syncState = async () => {
      try {
        const { data: roomData } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', room.id)
          .maybeSingle();

        if (roomData) {
          const prevStatus = room.status;
          const prevIndex = room.current_question_index;
          const newIndex = roomData.current_question_order !== undefined
            ? roomData.current_question_order
            : (roomData.current_question_index !== undefined ? roomData.current_question_index : prevIndex);

          setRoom((prev) => prev ? {
            ...prev,
            status: roomData.status,
            current_question_index: newIndex,
            question_start_time: roomData.question_started_at || roomData.question_start_time,
            time_per_question: roomData.time_per_question || prev.time_per_question
          } : null);

          if (newIndex !== prevIndex || roomData.status !== prevStatus) {
            setSelectedOption(null);
            setIsLocked(false);
            setAnswerResult(null);
            questionStartTimeRef.current = Date.now();
          }
        }

        if (room.status === 'playing' || room.status === 'finished') {
          const { data: lbData } = await supabase
            .from('game_participants')
            .select('*')
            .eq('game_id', room.id)
            .order('total_score', { ascending: false });

          if (lbData) {
            const formattedLb = lbData.map((p: any) => ({
              ...p,
              participant_number: String(p.participant_number).padStart(2, '0')
            }));
            setLeaderboard(formattedLb);
            const me = formattedLb.find((p: any) => p.id === participant.id);
            if (me) {
              setParticipant((prev) => prev ? { ...prev, total_score: me.total_score } : me);
            }
          }
        }
      } catch {
        // silent sync catch
      }
    };

    syncState();
    pollIntervalRef.current = setInterval(syncState, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [room?.id, room?.status, room?.current_question_index, participant?.id]);

  // Countdown timer for active question
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
    if (loading) return; // Prevent double click
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
        console.error('[GAME JOIN DEBUG]', {
          roomCode: roomCodeClean,
          pin: pinClean,
          participantName: participantNameClean,
          sessionToken,
          error: rpcError
        });
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

      const formattedNumber = String(participantData.participant_number).padStart(2, '0');

      const normalizedRoom: GameRoom = {
        id: gameData.id,
        title: gameData.title,
        subject: gameData.subject,
        class_level: gameData.class_name || gameData.class_level || '',
        class_name: gameData.class_name || gameData.class_level || '',
        pin: String(gameData.pin),
        room_code: String(gameData.room_code),
        status: (gameData.status as any) || 'waiting',
        current_question_index: gameData.current_question_order !== undefined
          ? gameData.current_question_order
          : (gameData.current_question_index || 0),
        question_start_time: gameData.question_started_at || gameData.question_start_time || null,
        question_count: gameData.question_count || 0,
        time_per_question: gameData.time_per_question || 20,
        created_at: gameData.created_at || new Date().toISOString()
      };

      const normalizedParticipant: GameParticipant = {
        id: participantData.id,
        game_id: gameData.id,
        participant_number: formattedNumber,
        participant_name: participantData.participant_name,
        session_token: participantData.session_token || sessionToken,
        total_score: participantData.total_score || 0,
        correct_count: participantData.correct_count || 0,
        wrong_count: participantData.wrong_count || 0,
        unanswered_count: participantData.unanswered_count || 0
      };

      if (participantData.session_token) {
        localStorage.setItem(storageKey, participantData.session_token);
      }

      setRoom(normalizedRoom);
      setParticipant(normalizedParticipant);
      setStoredParticipant(roomCodeClean, normalizedParticipant);

      // Load questions directly from Supabase
      try {
        const { data: qData } = await supabase
          .from('game_questions')
          .select('*')
          .eq('game_id', gameData.id)
          .order('question_order', { ascending: true });
        if (qData && qData.length > 0) {
          setQuestions(qData as GameQuestion[]);
        }
      } catch (err) {
        console.error('[LOAD QUESTIONS ERROR]', err);
      }

    } catch (err: any) {
      console.error('[GAME JOIN ERROR]', err);
      console.error('[GAME JOIN DEBUG]', {
        roomCode: roomCodeClean,
        pin: pinClean,
        participantName: participantNameClean,
        sessionToken,
        error: err
      });
      setError(err.message || 'Gagal masuk ke Game Room');
    } finally {
      setLoading(false);
    }
  };

  // Submit Answer Handler
  const handleSelectAnswer = async (option: 'A' | 'B' | 'C' | 'D') => {
    if (isLocked || !room || !participant || secondsLeft <= 0) return;

    setSelectedOption(option);
    setIsLocked(true);

    const respMs = Date.now() - questionStartTimeRef.current;

    try {
      const currentQ = questions[room.current_question_index];
      const isCorrect = currentQ && currentQ.correct_answer === option;
      const score = isCorrect ? Math.max(100, Math.floor(1000 - (respMs / 1000) * 40)) : 0;

      // Try API if available, fallback smoothly
      try {
        const res = await submitGameAnswerApi({
          roomId: room.id,
          participantId: participant.id,
          questionIndex: room.current_question_index,
          answer: option,
          responseTimeMs: respMs
        });

        if (res.success) {
          setAnswerResult({
            is_correct: res.is_correct,
            score: res.score,
            correct_answer: res.correct_answer
          });
          if (res.score) {
            setParticipant(prev => prev ? { ...prev, total_score: (prev.total_score || 0) + (res.score || 0) } : null);
          }
          return;
        }
      } catch {
        // silent fallback
      }

      setAnswerResult({
        is_correct: isCorrect,
        score: score,
        correct_answer: currentQ?.correct_answer
      });
      if (score > 0) {
        setParticipant(prev => prev ? { ...prev, total_score: (prev.total_score || 0) + score } : null);
      }
    } catch (err: any) {
      console.error('Answer submission error:', err);
    }
  };

  const handleExitRoom = () => {
    if (room) clearStoredParticipant(room.room_code);
    setParticipant(null);
    setRoom(null);
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
  const currentQ = questions[room.current_question_index];
  const maxScore = Math.max(...leaderboard.map(p => p.total_score || 0), 1000);

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
              SOAL {room.current_question_index + 1} DARI {room.question_count}
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

