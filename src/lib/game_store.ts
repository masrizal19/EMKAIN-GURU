/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getApiUrl } from './api';
import { supabase } from './supabase';
import { GameRoom, GameQuestion, GameParticipant, GameAnswer } from '../types';

export const getStoredParticipant = (roomIdOrCode: string): GameParticipant | null => {
  try {
    const raw = sessionStorage.getItem(`game_participant_${roomIdOrCode.toUpperCase()}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredParticipant = (roomIdOrCode: string, participant: GameParticipant) => {
  try {
    sessionStorage.setItem(`game_participant_${roomIdOrCode.toUpperCase()}`, JSON.stringify(participant));
  } catch {
    // ignore
  }
};

export const clearStoredParticipant = (roomIdOrCode: string) => {
  try {
    sessionStorage.removeItem(`game_participant_${roomIdOrCode.toUpperCase()}`);
  } catch {
    // ignore
  }
};

export async function createGameRoomApi(payload: {
  title: string;
  subject: string;
  class_level: string;
  question_count: number;
  time_per_question: number;
  questions: Array<{
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: 'A' | 'B' | 'C' | 'D';
  }>;
  creator_id?: string;
  creator_name?: string;
}): Promise<{ success: boolean; room?: GameRoom; room_code?: string; pin?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('save_game', {
      p_title: payload.title.trim(),
      p_subject: payload.subject.trim(),
      p_class_name: payload.class_level.trim(),
      p_time_per_question: payload.time_per_question,
      p_questions: payload.questions
    });

    if (error) {
      console.error('[GAME SAVE ERROR]', error);
      return { 
        success: false, 
        error: error.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.' 
      };
    }

    if (!data || !data.success) {
      console.error('[GAME SAVE ERROR]', data);
      return { 
        success: false, 
        error: data?.message || 'Gagal membuat game di Supabase.' 
      };
    }

    const room: GameRoom = {
      id: data.game_id,
      title: payload.title.trim(),
      subject: payload.subject.trim(),
      class_level: payload.class_level.trim(),
      pin: String(data.pin),
      room_code: String(data.room_code),
      status: (data.status as any) || 'waiting',
      current_question_index: 0,
      question_count: data.question_count || payload.questions.length,
      time_per_question: payload.time_per_question,
      creator_id: payload.creator_id,
      creator_name: payload.creator_name,
      created_at: new Date().toISOString()
    };

    return {
      success: true,
      room,
      room_code: data.room_code,
      pin: data.pin
    };
  } catch (err: any) {
    console.error('[GAME SAVE ERROR]', err);
    return { 
      success: false, 
      error: err.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.' 
    };
  }
}

export async function deleteGameApi(gameId: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('delete_game', {
      p_game_id: gameId
    });

    if (error) {
      console.error('[GAME DELETE ERROR]', error);
      return { 
        success: false, 
        error: error.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.' 
      };
    }

    return { success: true, message: data?.message || 'Game berhasil dihapus' };
  } catch (err: any) {
    console.error('[GAME DELETE ERROR]', err);
    return { 
      success: false, 
      error: err.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.' 
    };
  }
}

export async function getGameDetailApi(gameId: string): Promise<{
  success: boolean;
  game?: GameRoom;
  questions?: GameQuestion[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_game_detail', {
      p_game_id: gameId
    });

    if (error) {
      console.error('[GAME DETAIL ERROR]', error);
      return { 
        success: false, 
        error: error.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.' 
      };
    }

    if (!data || !data.game) {
      return { success: false, error: 'Detail game tidak ditemukan' };
    }

    return {
      success: true,
      game: data.game,
      questions: data.questions || []
    };
  } catch (err: any) {
    console.error('[GAME DETAIL ERROR]', err);
    return { 
      success: false, 
      error: err.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.' 
    };
  }
}

export async function fetchGameRoomsApi(creatorId?: string): Promise<{ success: boolean; rooms?: GameRoom[]; error?: string }> {
  try {
    let query = supabase.from('game_rooms').select('*').order('created_at', { ascending: false });
    if (creatorId) {
      query = query.or(`creator_id.eq.${creatorId},creator_id.is.null`);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[GAME LIST ERROR]', error);
      return { success: false, error: error.message || 'Gagal terhubung ke Supabase. Periksa konfigurasi Supabase dan RPC Game.' };
    }
    return { success: true, rooms: (data || []) as GameRoom[] };
  } catch (err: any) {
    console.error('[GAME LIST ERROR]', err);
    return { success: false, error: err.message || 'Gagal memuat daftar game' };
  }
}

export async function fetchGameRoomApi(
  codeOrId: string, 
  asParticipant = false
): Promise<{
  success: boolean;
  room?: GameRoom;
  questions?: GameQuestion[];
  participants?: GameParticipant[];
  participant_count?: number;
  error?: string;
}> {
  try {
    const res = await fetch(
      getApiUrl(`/api/game/room/${encodeURIComponent(codeOrId)}?asParticipant=${asParticipant}`)
    );
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memuat room' };
  }
}

export async function joinGameRoomApi(payload: {
  room_code: string;
  pin: string;
  participant_name: string;
  session_token?: string | null;
  user_id?: string;
  existing_participant_id?: string;
}): Promise<{
  success: boolean;
  participant?: GameParticipant;
  room?: GameRoom;
  error?: string;
}> {
  try {
    const roomCode = payload.room_code.trim().toUpperCase();
    const pin = payload.pin.trim();
    const participantName = payload.participant_name.trim();
    const sessionToken = payload.session_token || null;

    console.log('[GAME JOIN REQUEST]', {
      roomCode,
      pin,
      participantName,
      sessionToken
    });

    const { data, error } = await supabase.rpc('join_game_room', {
      p_room_code: roomCode,
      p_pin: pin,
      p_name: participantName,
      p_session_token: sessionToken
    });

    if (error) {
      console.error('[GAME JOIN ERROR]', error);
      console.error('[GAME JOIN DEBUG]', {
        roomCode,
        pin,
        participantName,
        sessionToken,
        error
      });
      return {
        success: false,
        error: error.message || 'Gagal masuk ke Game Room'
      };
    }

    if (!data || !data.success || !data.participant || !data.game) {
      console.error('[GAME JOIN INVALID RESPONSE]', data);
      return {
        success: false,
        error: (data as any)?.message || 'Data Game Room tidak lengkap dari Supabase.'
      };
    }

    const game = data.game;
    const participant = data.participant;

    const formattedNumber = String(participant.participant_number).padStart(2, '0');

    const normalizedRoom: GameRoom = {
      id: game.id,
      title: game.title,
      subject: game.subject,
      class_level: game.class_name || game.class_level || '',
      class_name: game.class_name || game.class_level || '',
      pin: String(game.pin),
      room_code: String(game.room_code),
      status: (game.status as any) || 'waiting',
      current_question_index: game.current_question_order !== undefined
        ? game.current_question_order
        : (game.current_question_index || 0),
      question_start_time: game.question_started_at || game.question_start_time || null,
      question_count: game.question_count || 0,
      time_per_question: game.time_per_question || 20,
      created_at: game.created_at || new Date().toISOString()
    };

    const normalizedParticipant: GameParticipant = {
      id: participant.id,
      game_id: game.id,
      participant_number: formattedNumber,
      participant_name: participant.participant_name,
      session_token: participant.session_token || sessionToken,
      total_score: participant.total_score || 0,
      correct_count: participant.correct_count || 0,
      wrong_count: participant.wrong_count || 0,
      unanswered_count: participant.unanswered_count || 0
    };

    return {
      success: true,
      participant: normalizedParticipant,
      room: normalizedRoom
    };
  } catch (err: any) {
    console.error('[GAME JOIN ERROR]', err);
    console.error('[GAME JOIN DEBUG]', {
      payload,
      error: err
    });
    return {
      success: false,
      error: err.message || 'Gagal terhubung ke Supabase. Periksa koneksi dan coba lagi.'
    };
  }
}

export async function startGameRoomApi(roomId: string): Promise<{ success: boolean; room?: GameRoom; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/api/game/start'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memulai game' };
  }
}

export async function nextQuestionApi(roomId: string): Promise<{ success: boolean; room?: GameRoom; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/api/game/next'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal beralih ke soal berikutnya' };
  }
}

export async function submitGameAnswerApi(payload: {
  roomId: string;
  participantId: string;
  questionIndex: number;
  answer: 'A' | 'B' | 'C' | 'D';
  responseTimeMs: number;
}): Promise<{
  success: boolean;
  is_correct?: boolean;
  score?: number;
  correct_answer?: 'A' | 'B' | 'C' | 'D';
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/api/game/answer'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengirimkan jawaban' };
  }
}

export async function fetchGameLeaderboardApi(roomId: string): Promise<{
  success: boolean;
  room?: GameRoom;
  leaderboard?: GameParticipant[];
  top3?: GameParticipant[];
  total_participants?: number;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl(`/api/game/leaderboard/${encodeURIComponent(roomId)}`));
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memuat papan peringkat' };
  }
}

export async function fetchGameResultsApi(roomId: string): Promise<{
  success: boolean;
  room?: GameRoom;
  results?: Array<GameParticipant & {
    correct_count: number;
    wrong_count: number;
    unanswered_count: number;
    total_time_ms: number;
  }>;
  total_questions?: number;
  total_participants?: number;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl(`/api/game/results/${encodeURIComponent(roomId)}`));
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memuat ringkasan hasil' };
  }
}

export async function closeGameRoomApi(roomId: string): Promise<{ success: boolean; room?: GameRoom; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/api/game/close'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menutup room' };
  }
}
