/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Palette, Users, CheckCircle2, Lock, Sparkles, Trophy, 
  ArrowRight, RefreshCw, AlertCircle, Eye, LogOut
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ColorGame, ColorRound, ColorParticipant, ColorGuess } from '../../types';
import { hexToRgb, rgbToHex, calculateColorDistance } from '../../utils/colorGameUtils';

interface ColorStudentGameJoinProps {
  initialRoomCode?: string;
  onExit?: () => void;
}

export const ColorStudentGameJoin: React.FC<ColorStudentGameJoinProps> = ({
  initialRoomCode = '',
  onExit
}) => {
  // Join Form State
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [pin, setPin] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Active Session State
  const [participant, setParticipant] = useState<ColorParticipant | null>(null);
  const [game, setGame] = useState<ColorGame | null>(null);
  const [rounds, setRounds] = useState<ColorRound[]>([]);
  const [participantsList, setParticipantsList] = useState<ColorParticipant[]>([]);
  const [myGuesses, setMyGuesses] = useState<Record<number, ColorGuess>>({});

  // Color Picker State for Active Round
  const [pickedHex, setPickedHex] = useState<string>('#4F46E5');
  const [rVal, setRVal] = useState<number>(79);
  const [gVal, setGVal] = useState<number>(70);
  const [bVal, setBVal] = useState<number>(229);
  const [submittingGuess, setSubmittingGuess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-fill roomCode if prop changes
  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase());
    }
  }, [initialRoomCode]);

  // Sync HEX & RGB pickers
  const updateFromHex = (hex: string) => {
    setPickedHex(hex.toUpperCase());
    const rgb = hexToRgb(hex);
    setRVal(rgb.r);
    setGVal(rgb.g);
    setBVal(rgb.b);
  };

  const updateFromRgb = (r: number, g: number, b: number) => {
    const clampedR = Math.max(0, Math.min(255, r));
    const clampedG = Math.max(0, Math.min(255, g));
    const clampedB = Math.max(0, Math.min(255, b));
    setRVal(clampedR);
    setGVal(clampedG);
    setBVal(clampedB);
    setPickedHex(rgbToHex(clampedR, clampedG, clampedB));
  };

  // Restore session from localStorage if present
  useEffect(() => {
    const saved = localStorage.getItem('emkain_color_student_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.gameId && parsed.participantId) {
          rehydrateSession(parsed.gameId, parsed.participantId);
        }
      } catch (e) {
        localStorage.removeItem('emkain_color_student_session');
      }
    }
  }, []);

  const rehydrateSession = async (gameId: string, participantId: string) => {
    try {
      const { data: g } = await supabase.from('color_games').select('*').eq('id', gameId).single();
      const { data: p } = await supabase.from('color_participants').select('*').eq('id', participantId).single();
      const { data: r } = await supabase.from('color_rounds').select('*').eq('game_id', gameId).order('round_number', { ascending: true });

      if (g && p) {
        setGame(g as ColorGame);
        setParticipant(p as ColorParticipant);
        if (r) setRounds(r as ColorRound[]);

        // Load existing guesses
        const { data: gu } = await supabase.from('color_guesses').select('*').eq('participant_id', participantId);
        if (gu) {
          const guessMap: Record<number, ColorGuess> = {};
          gu.forEach((guessItem: any) => {
            const roundObj = (r || []).find((rnd: any) => rnd.id === guessItem.round_id);
            if (roundObj) {
              guessMap[roundObj.round_number] = guessItem as ColorGuess;
            }
          });
          setMyGuesses(guessMap);
        }
      }
    } catch (e) {
      console.error('Failed to rehydrate color game session:', e);
    }
  };

  // Handle Join Action
  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoining(true);

    const cleanCode = roomCode.trim().toUpperCase();
    const cleanPin = pin.trim();
    const cleanName = participantName.trim();

    if (!cleanCode || !cleanPin || !cleanName) {
      setJoinError('Harap lengkapi Kode Room, PIN, dan Nama Peserta.');
      setJoining(false);
      return;
    }

    try {
      // 1. Coba join via RPC join_color_game terlebih dahulu
      let gameData: any = null;
      let newPart: any = null;
      let roundData: any = null;

      const { data: rpcData, error: rpcErr } = await supabase.rpc('join_color_game', {
        p_room_code: cleanCode,
        p_pin: cleanPin,
        p_participant_name: cleanName
      });

      if (!rpcErr && rpcData) {
        gameData = rpcData.game || rpcData;
        newPart = rpcData.participant || rpcData;
        roundData = rpcData.rounds;
      } else {
        // 2. Fallback jika RPC tidak tersedia atau parameter berbeda
        const { data: directGame, error: gameErr } = await supabase
          .from('color_games')
          .select('*')
          .eq('room_code', cleanCode)
          .single();

        if (gameErr || !directGame) {
          setJoinError('Room Tebak Warna tidak ditemukan. Periksa kembali Kode Room.');
          setJoining(false);
          return;
        }

        if (String(directGame.pin).trim() !== cleanPin) {
          setJoinError('PIN Room tidak cocok. Silakan minta PIN kepada Guru.');
          setJoining(false);
          return;
        }

        if (directGame.status === 'closed') {
          setJoinError('Room ini sudah ditutup oleh Guru.');
          setJoining(false);
          return;
        }

        const { data: existingParts, count } = await supabase
          .from('color_participants')
          .select('*', { count: 'exact' })
          .eq('game_id', directGame.id);

        const nextNumber = (count || existingParts?.length || 0) + 1;

        const { data: insertedPart, error: partErr } = await supabase
          .from('color_participants')
          .insert({
            game_id: directGame.id,
            participant_name: cleanName,
            participant_number: nextNumber,
            total_score: 0,
            rounds_completed: 0
          })
          .select()
          .single();

        if (partErr || !insertedPart) {
          setJoinError('Gagal bergabung ke room: ' + (partErr?.message || 'Database error'));
          setJoining(false);
          return;
        }

        gameData = directGame;
        newPart = insertedPart;
      }

      // Fetch rounds jika belum ada dari RPC
      if (!roundData && gameData?.id) {
        const { data: fetchedRounds } = await supabase
          .from('color_rounds')
          .select('*')
          .eq('game_id', gameData.id)
          .order('round_number', { ascending: true });
        roundData = fetchedRounds;
      }

      setGame(gameData as ColorGame);
      setParticipant(newPart as ColorParticipant);
      if (roundData) setRounds(roundData as ColorRound[]);

      // Persist session locally
      localStorage.setItem('emkain_color_student_session', JSON.stringify({
        gameId: gameData.id,
        participantId: newPart.id
      }));

    } catch (err: any) {
      console.error('Join error:', err);
      setJoinError(err.message || 'Terjadi kesalahan saat bergabung ke game.');
    } finally {
      setJoining(false);
    }
  };

  // Realtime subscription when in active game
  useEffect(() => {
    if (!game?.id) return;

    // Load participants list
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('color_participants')
        .select('*')
        .eq('game_id', game.id)
        .order('participant_number', { ascending: true });
      if (data) setParticipantsList(data as ColorParticipant[]);
    };
    fetchParticipants();

    const channel = supabase
      .channel(`color_student_${game.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'color_games', filter: `id=eq.${game.id}` },
        (payload) => {
          if (payload.new) {
            setGame(payload.new as ColorGame);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'color_participants', filter: `game_id=eq.${game.id}` },
        () => {
          fetchParticipants();
          // Update own participant score
          if (participant?.id) {
            supabase
              .from('color_participants')
              .select('*')
              .eq('id', participant.id)
              .single()
              .then(({ data }) => {
                if (data) setParticipant(data as ColorParticipant);
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, participant?.id]);

  // Handle Guess Submission for current round
  const handleSubmitGuess = async () => {
    if (!game || !participant) return;
    const currentRound = rounds.find(r => r.round_number === game.current_round);
    if (!currentRound) return;

    // Check if already guessed
    if (myGuesses[game.current_round]) {
      return;
    }

    setSubmittingGuess(true);
    setSubmitError(null);

    try {
      // Calculate distance & score
      const { distance, score } = calculateColorDistance(
        { r: currentRound.target_r, g: currentRound.target_g, b: currentRound.target_b },
        { r: rVal, g: gVal, b: bVal }
      );

      // Insert guess
      const { data: newGuess, error: guessErr } = await supabase
        .from('color_guesses')
        .insert({
          game_id: game.id,
          round_id: currentRound.id,
          participant_id: participant.id,
          guessed_color: pickedHex,
          guessed_r: rVal,
          guessed_g: gVal,
          guessed_b: bVal,
          score,
          distance
        })
        .select()
        .single();

      if (guessErr) {
        setSubmitError('Gagal mengirim tebakan: ' + guessErr.message);
        setSubmittingGuess(false);
        return;
      }

      // Update state
      setMyGuesses(prev => ({
        ...prev,
        [game.current_round]: newGuess as ColorGuess
      }));

      // Update participant's total_score and rounds_completed
      const { data: allUserGuesses } = await supabase
        .from('color_guesses')
        .select('score')
        .eq('participant_id', participant.id);

      const totalScore = (allUserGuesses || []).reduce((acc, g) => acc + (g.score || 0), 0);
      const roundsCompleted = (allUserGuesses || []).length;

      await supabase
        .from('color_participants')
        .update({
          total_score: Number(totalScore.toFixed(2)),
          rounds_completed: roundsCompleted
        })
        .eq('id', participant.id);

    } catch (err: any) {
      console.error('Submit guess error:', err);
      setSubmitError(err.message || 'Gagal mengirim tebakan warna.');
    } finally {
      setSubmittingGuess(false);
    }
  };

  const handleLeaveGame = () => {
    if (window.confirm('Keluar dari room Tebak Warna ini?')) {
      localStorage.removeItem('emkain_color_student_session');
      setParticipant(null);
      setGame(null);
      setMyGuesses({});
      if (onExit) onExit();
    }
  };

  // =========================================================================
  // VIEW 1: JOIN FORM (Not Joined Yet)
  // =========================================================================
  if (!participant || !game) {
    return (
      <div className="w-full max-w-md mx-auto p-6 md:p-8 bg-white rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] font-body space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#FFD166] border-2 border-gray-900 flex items-center justify-center text-2xl mx-auto shadow-[3px_3px_0_rgba(0,0,0,1)]">
            🎨
          </div>
          <h1 className="text-2xl font-black font-display text-gray-900 uppercase tracking-tight">
            GABUNG TEBAK WARNA
          </h1>
          <p className="text-xs font-bold text-gray-600">
            Masukkan Kode Room, PIN dari Guru, dan Nama Anda.
          </p>
        </div>

        {joinError && (
          <div className="p-3.5 bg-red-100 border-2 border-red-700 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{joinError}</span>
          </div>
        )}

        <form onSubmit={handleJoinGame} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-gray-800 tracking-wider">
              KODE ROOM
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Contoh: CLR99"
              required
              className="w-full px-4 py-3 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 font-display font-black text-lg tracking-widest text-center uppercase focus:outline-none focus:bg-white focus:shadow-[2px_2px_0_rgba(0,0,0,1)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-gray-800 tracking-wider">
              PIN GAME
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Contoh: 1234"
              required
              className="w-full px-4 py-3 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 font-display font-black text-lg tracking-widest text-center focus:outline-none focus:bg-white focus:shadow-[2px_2px_0_rgba(0,0,0,1)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-gray-800 tracking-wider">
              NAMA ANDA
            </label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Nama Lengkap / Panggilan"
              required
              className="w-full px-4 py-3 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 font-bold text-sm focus:outline-none focus:bg-white focus:shadow-[2px_2px_0_rgba(0,0,0,1)]"
            />
          </div>

          <button
            type="submit"
            disabled={joining}
            className="w-full py-4 bg-[#FFD166] hover:bg-yellow-300 disabled:opacity-50 text-gray-900 border-3 border-gray-900 rounded-2xl font-black text-base uppercase tracking-wider cursor-pointer shadow-[4px_4px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2"
          >
            {joining ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span>{joining ? 'MENYAMBUNGKAN...' : 'GABUNG ROOM GAME'}</span>
          </button>
        </form>

        {onExit && (
          <div className="text-center pt-2">
            <button
              onClick={onExit}
              className="text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-wider"
            >
              ← Kembali
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // ACTIVE GAME SHELL FOR STUDENT
  // =========================================================================
  const currentRound = rounds.find(r => r.round_number === game.current_round);
  const currentGuess = myGuesses[game.current_round];
  const hasGuessedCurrentRound = !!currentGuess;

  return (
    <div className="w-full max-w-xl mx-auto p-5 md:p-8 space-y-6 font-body">
      {/* Top Participant Pill */}
      <div className="p-4 bg-white rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-[#FFD166] border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-900 flex-shrink-0 shadow-[1px_1px_0_rgba(0,0,0,1)]">
            {String(participant.participant_number).padStart(2, '0')}
          </span>
          <div className="truncate">
            <span className="text-[10px] font-black uppercase text-gray-400 block leading-none">PESERTA</span>
            <span className="text-sm font-black text-gray-900 truncate block mt-0.5">
              {participant.participant_name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="px-3 py-1 bg-[#FAF6F0] rounded-xl border border-gray-900 text-right">
            <span className="text-[9px] font-black uppercase text-gray-400 block leading-none">TOTAL SKOR</span>
            <span className="text-xs font-black font-display text-gray-900">
              {Number(participant.total_score || 0).toFixed(2)} pt
            </span>
          </div>

          <button
            onClick={handleLeaveGame}
            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
            title="Keluar dari room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHASE 1: WAITING IN LOBBY */}
      {/* ========================================================================= */}
      {game.status === 'waiting' && (
        <div className="p-8 bg-[#FFD166] rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center text-3xl mx-auto shadow-[3px_3px_0_rgba(0,0,0,1)] animate-bounce">
            ⏳
          </div>

          <div className="space-y-1">
            <span className="px-3 py-1 bg-white rounded-full border border-gray-900 text-[10px] font-black uppercase tracking-wider">
              RUANG TUNGGU TEBAK WARNA
            </span>
            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-gray-900">
              MENUNGGU GURU MEMULAI GAME...
            </h2>
            <p className="text-xs font-bold text-gray-800">
              Anda terdaftar sebagai peserta nomor <span className="underline">{String(participant.participant_number).padStart(2, '0')}</span>.
            </p>
          </div>

          {/* Connected Classmates list */}
          <div className="pt-4 p-4 bg-white rounded-2xl border-2 border-gray-900 text-left space-y-3 shadow-[3px_3px_0_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between text-xs font-black uppercase text-gray-700">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>TEMAN DI LOBBY ({participantsList.length})</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-600">● REALTIME</span>
            </div>

            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
              {participantsList.map((p) => (
                <span
                  key={p.id}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                    p.id === participant.id
                      ? 'bg-[#FFD166] border-gray-900 font-black text-gray-900 shadow-xs'
                      : 'bg-[#FAF6F0] border-gray-300 text-gray-700'
                  }`}
                >
                  {String(p.participant_number).padStart(2, '0')} {p.participant_name}
                  {p.id === participant.id && ' (Anda)'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 2: MEMORIZE (INGAT 5 WARNA TARGET) */}
      {/* ========================================================================= */}
      {game.status === 'memorize' && (
        <div className="p-6 md:p-8 bg-white rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] text-center space-y-6">
          <div>
            <span className="inline-block px-3 py-1 bg-[#FFD166] rounded-full border-2 border-gray-900 text-[10px] font-black uppercase mb-2">
              FASE MENGINGAT
            </span>
            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-gray-900">
              INGAT 5 WARNA INI!
            </h2>
            <p className="text-xs font-bold text-gray-600 mt-1">
              Perhatikan baik-baik. Warna akan disembunyikan saat fase tebak dimulai.
            </p>
          </div>

          {/* 5 Target Color Swatches */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {rounds.map((r, idx) => (
              <div
                key={r.id}
                className="bg-[#FAF6F0] rounded-2xl border-2 border-gray-900 p-2.5 space-y-2 shadow-[3px_3px_0_rgba(0,0,0,1)] flex flex-col items-center"
              >
                <span className="px-2.5 py-0.5 bg-white rounded-full border border-gray-900 text-[10px] font-black uppercase text-gray-900">
                  WARNA {idx + 1}
                </span>
                
                <div
                  className="w-full h-24 sm:h-28 rounded-xl border-2 border-gray-900 shadow-inner"
                  style={{ backgroundColor: r.target_color }}
                />
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#B4D3FF] rounded-xl border-2 border-gray-900 text-xs font-bold text-blue-950">
            ⏳ Menunggu Guru memulai ronde tebakan warna...
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 3: PLAYING (COLOR PICKER & GUESS SUBMIT) */}
      {/* ========================================================================= */}
      {game.status === 'playing' && currentRound && (
        <div className="p-6 md:p-8 bg-white rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] space-y-6">
          <div className="text-center space-y-1">
            <span className="px-3.5 py-1 bg-[#FF8B7B] rounded-full border-2 border-gray-900 text-xs font-black uppercase text-gray-900 shadow-[2px_2px_0_rgba(0,0,0,1)]">
              RONDE {game.current_round} DARI {game.total_rounds}
            </span>
            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-gray-900 mt-2">
              TEBAK WARNA NOMOR {game.current_round}
            </h2>
            <p className="text-xs font-bold text-gray-600">
              Buat kembali warna nomor {game.current_round} yang baru saja Anda lihat.
            </p>
          </div>

          {submitError && (
            <div className="p-3 bg-red-100 border-2 border-red-700 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* ACTIVE COLOR PICKER UI */}
          {!hasGuessedCurrentRound ? (
            <div className="space-y-6">
              {/* LIVE COLOR PREVIEW SWATCH */}
              <div 
                className="w-full h-36 md:h-44 rounded-2xl border-3 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col justify-end p-4 transition-colors"
                style={{ backgroundColor: pickedHex }}
              >
                <div className="bg-white/90 backdrop-blur-xs p-2 rounded-xl border border-gray-900 max-w-fit shadow-xs">
                  <span className="text-[10px] font-black uppercase text-gray-500 block leading-none">WARNA PILIHAN ANDA</span>
                  <span className="text-sm font-mono font-black text-gray-900 block mt-0.5">{pickedHex}</span>
                </div>
              </div>

              {/* CONTROLS: NATIVE COLOR INPUT + RGB SLIDERS */}
              <div className="p-4 bg-[#FAF6F0] rounded-2xl border-2 border-gray-900 space-y-4 shadow-[2px_2px_0_rgba(0,0,0,1)]">
                {/* Native Picker Button */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-black uppercase text-gray-800 tracking-wider">
                    PILIH WARNA:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pickedHex}
                      onChange={(e) => updateFromHex(e.target.value)}
                      className="w-10 h-10 rounded-xl border-2 border-gray-900 cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={pickedHex}
                      onChange={(e) => updateFromHex(e.target.value)}
                      className="w-24 px-2 py-1.5 bg-white rounded-lg border border-gray-900 font-mono font-black text-xs text-center uppercase"
                    />
                  </div>
                </div>

                {/* RGB SLIDERS */}
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  {/* RED */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-black text-red-600">
                      <span>MERAH (R)</span>
                      <span className="font-mono">{rVal}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={rVal}
                      onChange={(e) => updateFromRgb(Number(e.target.value), gVal, bVal)}
                      className="w-full accent-red-500 cursor-pointer"
                    />
                  </div>

                  {/* GREEN */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-black text-emerald-600">
                      <span>HIJAU (G)</span>
                      <span className="font-mono">{gVal}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={gVal}
                      onChange={(e) => updateFromRgb(rVal, Number(e.target.value), bVal)}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* BLUE */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-black text-blue-600">
                      <span>BIRU (B)</span>
                      <span className="font-mono">{bVal}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={bVal}
                      onChange={(e) => updateFromRgb(rVal, gVal, Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                onClick={handleSubmitGuess}
                disabled={submittingGuess}
                className="w-full py-4 bg-[#C1F2D0] hover:bg-emerald-300 disabled:opacity-50 text-gray-900 border-3 border-gray-900 rounded-2xl font-black text-base uppercase tracking-wider cursor-pointer shadow-[4px_4px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2"
              >
                {submittingGuess ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                <span>{submittingGuess ? 'MENGIRIM JAWABAN...' : 'KIRIM TEBAKAN WARNA'}</span>
              </button>
            </div>
          ) : (
            // ALREADY SUBMITTED STATE FOR THIS ROUND
            <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-600 text-center space-y-4 shadow-[3px_3px_0_rgba(0,0,0,1)] animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-[#C1F2D0] border-2 border-gray-900 flex items-center justify-center text-emerald-800 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase text-gray-900 font-display">
                  JAWABAN ANDA TELAH TERKIRIM!
                </h3>
                <p className="text-xs font-bold text-gray-600">
                  Tebakan Anda untuk Ronde {game.current_round} telah disimpan dengan skor {currentGuess.score.toFixed(2)}/10.
                </p>
              </div>

              {/* Color Guessed Preview */}
              <div className="flex items-center justify-center gap-4 py-2">
                <div className="text-center space-y-1">
                  <div 
                    className="w-20 h-20 rounded-xl border-2 border-gray-900 shadow-sm mx-auto"
                    style={{ backgroundColor: currentGuess.guessed_color }}
                  />
                  <span className="text-[10px] font-mono font-bold text-gray-700 block">
                    {currentGuess.guessed_color}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-gray-300 text-xs font-bold text-gray-500">
                ⏳ Harap tunggu sementara Guru melanjutkan ke ronde berikutnya...
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 4: FINISHED (PODIUM TOP 3) */}
      {/* ========================================================================= */}
      {(game.status === 'finished' || game.status === 'closed') && (
        <div className="p-6 md:p-8 bg-white rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] text-center space-y-6">
          <div>
            <span className="inline-block px-3 py-1 bg-[#FFD166] rounded-full border-2 border-gray-900 text-[10px] font-black uppercase mb-2">
              🏆 GAME SELESAI
            </span>
            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-gray-900">
              HASIL AKHIR TEBAK WARNA
            </h2>
          </div>

          {/* Student's Personal Card */}
          <div className="p-4 bg-[#FAF6F0] rounded-2xl border-2 border-gray-900 space-y-2">
            <span className="text-xs font-black uppercase text-gray-600 block">HASIL ANDA</span>
            <div className="text-3xl font-black font-display text-gray-900">
              {Number(participant.total_score || 0).toFixed(2)} <span className="text-sm font-body">/ 50.00 PTS</span>
            </div>
            <p className="text-xs font-bold text-gray-600">
              Menyelesaikan {participant.rounds_completed || 0} dari 5 ronde.
            </p>
          </div>

          {/* Top 3 List */}
          <div className="space-y-3 pt-2 text-left">
            <h4 className="text-xs font-black uppercase text-gray-700 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>PAPAN PERINGKAT TOP PESERTA:</span>
            </h4>

            <div className="space-y-2">
              {[...participantsList]
                .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
                .slice(0, 5)
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border-2 border-gray-900 flex items-center justify-between shadow-[2px_2px_0_rgba(0,0,0,1)] ${
                      p.id === participant.id ? 'bg-[#FFD166]' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-black text-sm">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <span className="text-xs font-black text-gray-900 truncate">
                        {String(p.participant_number).padStart(2, '0')} {p.participant_name}
                        {p.id === participant.id && ' (Anda)'}
                      </span>
                    </div>
                    <span className="font-black font-display text-sm text-gray-900">
                      {Number(p.total_score || 0).toFixed(2)} pt
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <button
            onClick={handleLeaveGame}
            className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase cursor-pointer"
          >
            SELESAI & KELUAR
          </button>
        </div>
      )}
    </div>
  );
};
