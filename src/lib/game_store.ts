/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getApiUrl } from './api';
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
    const res = await fetch(getApiUrl('/api/game/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal terhubung ke server' };
  }
}

export async function fetchGameRoomsApi(creatorId?: string): Promise<{ success: boolean; rooms?: GameRoom[]; error?: string }> {
  try {
    const url = creatorId 
      ? getApiUrl(`/api/game/rooms?creator_id=${encodeURIComponent(creatorId)}`)
      : getApiUrl('/api/game/rooms');
    const res = await fetch(url);
    return await res.json();
  } catch (err: any) {
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
  user_id?: string;
  existing_participant_id?: string;
}): Promise<{
  success: boolean;
  participant?: GameParticipant;
  room?: GameRoom;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/api/game/join'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal bergabung ke room' };
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
