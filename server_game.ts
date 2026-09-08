/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { GameRoom, GameQuestion, GameParticipant, GameAnswer } from './src/types';

// Disk persistence fallback for game rooms
const DATA_FILE = path.join(process.cwd(), '.game_store.json');

interface LocalGameData {
  rooms: GameRoom[];
  questions: GameQuestion[];
  participants: GameParticipant[];
  answers: GameAnswer[];
}

let localData: LocalGameData = {
  rooms: [],
  questions: [],
  participants: [],
  answers: []
};

// Load saved data if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    localData = JSON.parse(raw);
  }
} catch (e) {
  console.warn('[GAME STORE] Failed to read .game_store.json, starting fresh', e);
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(localData, null, 2), 'utf-8');
  } catch (e) {
    console.error('[GAME STORE] Error saving .game_store.json:', e);
  }
}

function getSupabaseAdmin() {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!url || !key) return null;
  let cleaned = url.replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/(auth|rest|api|v1).*$/, '');
  return createClient(cleaned, key);
}

export function setupGameRoutes(app: express.Express) {
  // 1. CREATE GAME ROOM & QUESTIONS
  app.post('/api/game/create', async (req, res): Promise<any> => {
    try {
      const {
        title,
        subject,
        class_level,
        question_count,
        time_per_question,
        questions,
        creator_id,
        creator_name
      } = req.body;

      if (!title || !subject || !class_level || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ success: false, error: 'Semua field wajib diisi lengkap.' });
      }

      if (questions.length < 5 || questions.length > 20) {
        return res.status(400).json({ success: false, error: 'Jumlah soal harus antara 5 sampai 20 soal.' });
      }

      const roomId = crypto.randomUUID();
      // Generate 6-digit PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      // Generate clean room code
      const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let codeSuffix = '';
      for (let i = 0; i < 4; i++) {
        codeSuffix += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
      }
      const roomCode = `GAME-${codeSuffix}`;

      const newRoom: GameRoom = {
        id: roomId,
        creator_id: creator_id || null,
        creator_name: creator_name || 'Guru EMKAIN',
        title: title.trim(),
        subject: subject.trim(),
        class_level: class_level.trim(),
        pin: pin,
        room_code: roomCode,
        status: 'waiting',
        current_question_index: 0,
        question_start_time: null,
        question_count: questions.length,
        time_per_question: Number(time_per_question) || 20,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const preparedQuestions: GameQuestion[] = questions.map((q: any, idx: number) => ({
        id: crypto.randomUUID(),
        game_id: roomId,
        question_order: idx + 1,
        question: q.question.trim(),
        option_a: q.option_a.trim(),
        option_b: q.option_b.trim(),
        option_c: q.option_c.trim(),
        option_d: q.option_d.trim(),
        correct_answer: (q.correct_answer || 'A').toUpperCase() as 'A' | 'B' | 'C' | 'D'
      }));

      // Store in memory & file
      localData.rooms.unshift(newRoom);
      localData.questions.push(...preparedQuestions);
      saveData();

      // Attempt insert into Supabase if tables exist
      const sb = getSupabaseAdmin();
      if (sb) {
        try {
          await sb.from('game_rooms').insert([newRoom]);
          await sb.from('game_questions').insert(preparedQuestions);
        } catch (sbErr) {
          console.log('[GAME] Supabase insert note (using in-memory fallback):', sbErr);
        }
      }

      return res.json({
        success: true,
        room: newRoom,
        room_code: roomCode,
        pin: pin
      });
    } catch (err: any) {
      console.error('[GAME CREATE ERROR]:', err);
      return res.status(500).json({ success: false, error: err.message || 'Gagal membuat game' });
    }
  });

  // 2. LIST GAME ROOMS
  app.get('/api/game/rooms', async (req, res): Promise<any> => {
    try {
      const creatorId = req.query.creator_id as string;
      const sb = getSupabaseAdmin();
      
      // Try Supabase first
      if (sb) {
        try {
          let query = sb.from('game_rooms').select('*').order('created_at', { ascending: false });
          if (creatorId) {
            query = query.or(`creator_id.eq.${creatorId},creator_id.is.null`);
          }
          const { data, error } = await query;
          if (!error && data && data.length > 0) {
            return res.json({ success: true, rooms: data });
          }
        } catch (e) {
          // fallback to local
        }
      }

      let filtered = localData.rooms;
      if (creatorId) {
        filtered = localData.rooms.filter(r => !r.creator_id || r.creator_id === creatorId);
      }
      return res.json({ success: true, rooms: filtered });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. GET ROOM BY CODE OR ID
  app.get('/api/game/room/:codeOrId', async (req, res): Promise<any> => {
    try {
      const codeOrId = req.params.codeOrId.toUpperCase();
      const asParticipant = req.query.asParticipant === 'true';

      let room = localData.rooms.find(
        r => r.room_code.toUpperCase() === codeOrId || r.id === req.params.codeOrId
      );

      // Check Supabase if not found locally
      const sb = getSupabaseAdmin();
      if (!room && sb) {
        try {
          const { data } = await sb
            .from('game_rooms')
            .select('*')
            .or(`room_code.eq.${codeOrId},id.eq.${req.params.codeOrId}`)
            .single();
          if (data) room = data;
        } catch (e) {
          // ignore
        }
      }

      if (!room) {
        return res.status(404).json({ success: false, error: 'Room Game tidak ditemukan.' });
      }

      // Fetch questions
      let questions = localData.questions.filter(q => q.game_id === room!.id);
      if (questions.length === 0 && sb) {
        try {
          const { data } = await sb
            .from('game_questions')
            .select('*')
            .eq('game_id', room.id)
            .order('question_order', { ascending: true });
          if (data) questions = data;
        } catch (e) {
          // ignore
        }
      }

      // Fetch participants
      let participants = localData.participants.filter(p => p.game_id === room!.id);
      if (participants.length === 0 && sb) {
        try {
          const { data } = await sb
            .from('game_participants')
            .select('*')
            .eq('game_id', room.id)
            .order('participant_number', { ascending: true });
          if (data) participants = data;
        } catch (e) {
          // ignore
        }
      }

      // ANTI-CHEAT: If requester is a participant, DO NOT send correct_answer!
      const sanitizedQuestions = questions.map(q => {
        if (asParticipant) {
          const { correct_answer, ...rest } = q;
          return rest;
        }
        return q;
      });

      return res.json({
        success: true,
        room,
        questions: sanitizedQuestions,
        participants,
        participant_count: participants.length
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. JOIN GAME ROOM
  app.post('/api/game/join', async (req, res): Promise<any> => {
    try {
      const { room_code, pin, participant_name, user_id, existing_participant_id } = req.body;

      if (!room_code || !pin || !participant_name) {
        return res.status(400).json({ success: false, error: 'Room code, PIN, dan Nama Anda wajib diisi.' });
      }

      const cleanCode = room_code.trim().toUpperCase();
      const cleanPin = pin.trim();
      const cleanName = participant_name.trim();

      if (!cleanName) {
        return res.status(400).json({ success: false, error: 'Nama Anda tidak boleh kosong.' });
      }

      let room = localData.rooms.find(r => r.room_code.toUpperCase() === cleanCode || r.id === cleanCode);
      const sb = getSupabaseAdmin();
      if (!room && sb) {
        try {
          const { data } = await sb.from('game_rooms').select('*').or(`room_code.eq.${cleanCode},id.eq.${cleanCode}`).single();
          if (data) room = data;
        } catch (e) {}
      }

      if (!room) {
        return res.status(404).json({ success: false, error: 'Room Game tidak ditemukan. Periksa kembali Kode Game.' });
      }

      if (room.status === 'closed') {
        return res.status(400).json({ success: false, error: 'ROOM SUDAH DITUTUP oleh Guru.' });
      }

      if (room.pin !== cleanPin) {
        return res.status(400).json({ success: false, error: 'PIN GAME SALAH. Silakan cek kembali PIN yang diberikan Guru.' });
      }

      // Check if participant already exists in this room session
      let existing: GameParticipant | undefined;
      if (existing_participant_id) {
        existing = localData.participants.find(p => p.id === existing_participant_id && p.game_id === room!.id);
      }
      if (!existing && user_id) {
        existing = localData.participants.find(p => p.user_id === user_id && p.game_id === room!.id);
      }

      if (existing) {
        // Return existing participant without changing number
        return res.json({
          success: true,
          participant: existing,
          room
        });
      }

      // Calculate next participant number scoped to this room: '01', '02', '03'...
      const currentRoomParticipants = localData.participants.filter(p => p.game_id === room!.id);
      const nextNum = currentRoomParticipants.length + 1;
      const participantNumber = String(nextNum).padStart(2, '0');

      const newParticipant: GameParticipant = {
        id: crypto.randomUUID(),
        game_id: room.id,
        participant_number: participantNumber,
        participant_name: cleanName,
        user_id: user_id || null,
        joined_at: new Date().toISOString(),
        total_score: 0,
        last_answered_index: -1
      };

      localData.participants.push(newParticipant);
      saveData();

      if (sb) {
        try {
          await sb.from('game_participants').insert([newParticipant]);
        } catch (e) {}
      }

      return res.json({
        success: true,
        participant: newParticipant,
        room
      });
    } catch (err: any) {
      console.error('[GAME JOIN ERROR]:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. START GAME
  app.post('/api/game/start', async (req, res): Promise<any> => {
    try {
      const { roomId } = req.body;
      const room = localData.rooms.find(r => r.id === roomId || r.room_code === roomId);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room tidak ditemukan' });
      }

      room.status = 'playing';
      room.current_question_index = 0;
      room.question_start_time = new Date().toISOString();
      room.updated_at = new Date().toISOString();
      saveData();

      const sb = getSupabaseAdmin();
      if (sb) {
        try {
          await sb.from('game_rooms').update({
            status: 'playing',
            current_question_index: 0,
            question_start_time: room.question_start_time,
            updated_at: room.updated_at
          }).eq('id', room.id);
        } catch (e) {}
      }

      return res.json({ success: true, room });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. NEXT QUESTION OR FINISH GAME
  app.post('/api/game/next', async (req, res): Promise<any> => {
    try {
      const { roomId } = req.body;
      const room = localData.rooms.find(r => r.id === roomId || r.room_code === roomId);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room tidak ditemukan' });
      }

      const nextIndex = room.current_question_index + 1;
      if (nextIndex >= room.question_count) {
        room.status = 'finished';
      } else {
        room.current_question_index = nextIndex;
        room.question_start_time = new Date().toISOString();
      }
      room.updated_at = new Date().toISOString();
      saveData();

      const sb = getSupabaseAdmin();
      if (sb) {
        try {
          await sb.from('game_rooms').update({
            status: room.status,
            current_question_index: room.current_question_index,
            question_start_time: room.question_start_time,
            updated_at: room.updated_at
          }).eq('id', room.id);
        } catch (e) {}
      }

      return res.json({ success: true, room });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. SUBMIT ANSWER (Anti-Cheat Validation & Speed-Based Scoring)
  app.post('/api/game/answer', async (req, res): Promise<any> => {
    try {
      const {
        roomId,
        participantId,
        questionIndex,
        answer,
        responseTimeMs
      } = req.body;

      if (!roomId || !participantId || questionIndex === undefined || !answer) {
        return res.status(400).json({ success: false, error: 'Data jawaban tidak lengkap' });
      }

      const room = localData.rooms.find(r => r.id === roomId || r.room_code === roomId);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room tidak ditemukan' });
      }

      const participant = localData.participants.find(p => p.id === participantId && p.game_id === room.id);
      if (!participant) {
        return res.status(404).json({ success: false, error: 'Peserta tidak ditemukan' });
      }

      // Check if already answered this question index (Locked answer rule)
      const alreadyAnswered = localData.answers.find(
        a => a.game_id === room.id && a.participant_id === participantId && a.question_index === questionIndex
      );
      if (alreadyAnswered) {
        return res.json({
          success: true,
          is_correct: alreadyAnswered.is_correct,
          score: alreadyAnswered.score,
          correct_answer: localData.questions.find(q => q.id === alreadyAnswered.question_id)?.correct_answer,
          message: 'Jawaban sudah dikunci sebelumnya'
        });
      }

      // Find question
      const question = localData.questions.find(
        q => q.game_id === room.id && q.question_order === (questionIndex + 1)
      );

      if (!question) {
        return res.status(404).json({ success: false, error: 'Soal tidak ditemukan' });
      }

      const isCorrect = (question.correct_answer || 'A').toUpperCase() === answer.toUpperCase();
      let score = 0;

      if (isCorrect) {
        // Speed-based scoring:
        // Base 500 points + up to 500 points speed bonus
        const totalDurationMs = (room.time_per_question || 20) * 1000;
        const respMs = Math.min(Math.max(0, responseTimeMs || 0), totalDurationMs);
        const timeRemainingRatio = (totalDurationMs - respMs) / totalDurationMs;
        const bonus = Math.round(500 * Math.max(0, timeRemainingRatio));
        score = 500 + bonus;
      }

      const newAnswer: GameAnswer = {
        id: crypto.randomUUID(),
        game_id: room.id,
        question_id: question.id,
        participant_id: participant.id,
        question_index: questionIndex,
        answer: answer.toUpperCase() as 'A' | 'B' | 'C' | 'D',
        is_correct: isCorrect,
        response_time_ms: responseTimeMs || 0,
        score: score,
        answered_at: new Date().toISOString()
      };

      localData.answers.push(newAnswer);
      participant.total_score = (participant.total_score || 0) + score;
      participant.last_answered_index = questionIndex;
      saveData();

      const sb = getSupabaseAdmin();
      if (sb) {
        try {
          await sb.from('game_answers').insert([newAnswer]);
          await sb.from('game_participants').update({
            total_score: participant.total_score,
            last_answered_index: questionIndex
          }).eq('id', participant.id);
        } catch (e) {}
      }

      return res.json({
        success: true,
        is_correct: isCorrect,
        score: score,
        correct_answer: question.correct_answer
      });
    } catch (err: any) {
      console.error('[GAME ANSWER ERROR]:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. LEADERBOARD (Top 3 & Full Participants)
  app.get('/api/game/leaderboard/:roomId', async (req, res): Promise<any> => {
    try {
      const { roomId } = req.params;
      const room = localData.rooms.find(r => r.id === roomId || r.room_code === roomId);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room tidak ditemukan' });
      }

      const participants = localData.participants.filter(p => p.game_id === room.id);
      
      // Calculate metrics per participant
      const leaderboard = participants.map(p => {
        const answers = localData.answers.filter(a => a.participant_id === p.id && a.game_id === room.id);
        const correctCount = answers.filter(a => a.is_correct).length;
        const wrongCount = answers.filter(a => !a.is_correct).length;
        const totalTime = answers.reduce((acc, a) => acc + (a.response_time_ms || 0), 0);

        return {
          ...p,
          correct_count: correctCount,
          wrong_count: wrongCount,
          total_time_ms: totalTime
        };
      });

      // Sort: Highest total_score first, then fastest total_time_ms
      leaderboard.sort((a, b) => {
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }
        return (a.total_time_ms || 0) - (b.total_time_ms || 0);
      });

      const top3 = leaderboard.slice(0, 3);

      return res.json({
        success: true,
        room,
        leaderboard,
        top3,
        total_participants: leaderboard.length
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. FULL GAME RESULTS SUMMARY
  app.get('/api/game/results/:roomId', async (req, res): Promise<any> => {
    try {
      const { roomId } = req.params;
      const room = localData.rooms.find(r => r.id === roomId || r.room_code === roomId);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room tidak ditemukan' });
      }

      const participants = localData.participants.filter(p => p.game_id === room.id);
      const totalQuestions = room.question_count;

      const results = participants.map(p => {
        const answers = localData.answers.filter(a => a.participant_id === p.id && a.game_id === room.id);
        const correctCount = answers.filter(a => a.is_correct).length;
        const wrongCount = answers.filter(a => !a.is_correct).length;
        const unansweredCount = Math.max(0, totalQuestions - answers.length);
        const totalTime = answers.reduce((acc, a) => acc + (a.response_time_ms || 0), 0);

        return {
          ...p,
          correct_count: correctCount,
          wrong_count: wrongCount,
          unanswered_count: unansweredCount,
          total_time_ms: totalTime
        };
      });

      results.sort((a, b) => {
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }
        return (a.total_time_ms || 0) - (b.total_time_ms || 0);
      });

      return res.json({
        success: true,
        room,
        results,
        total_questions: totalQuestions,
        total_participants: results.length
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. CLOSE ROOM
  app.post('/api/game/close', async (req, res): Promise<any> => {
    try {
      const { roomId } = req.body;
      const room = localData.rooms.find(r => r.id === roomId || r.room_code === roomId);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room tidak ditemukan' });
      }

      room.status = 'closed';
      room.updated_at = new Date().toISOString();
      saveData();

      const sb = getSupabaseAdmin();
      if (sb) {
        try {
          await sb.from('game_rooms').update({ status: 'closed' }).eq('id', room.id);
        } catch (e) {}
      }

      return res.json({ success: true, room });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
}
