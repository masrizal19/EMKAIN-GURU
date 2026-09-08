/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, Users, Play, Trophy, Copy, CheckCircle2, 
  ChevronRight, Maximize2, Minimize2, Eye, EyeOff, RotateCcw,
  Sparkles, Check, ArrowLeft, AlertCircle, X
} from 'lucide-react';
import { ColorGame, ColorRound, ColorParticipant, ColorGuess, UserProfile } from '../../types';
import { supabase } from '../../lib/supabase';
import { calculateColorDistance } from '../../utils/colorGameUtils';

interface ColorTeacherGameRoomProps {
  gameId: string;
  profile: UserProfile;
  onExit: () => void;
}

export const ColorTeacherGameRoom: React.FC<ColorTeacherGameRoomProps> = ({
  gameId,
  profile,
  onExit
}) => {
  const [game, setGame] = useState<ColorGame | null>(null);
  const [rounds, setRounds] = useState<ColorRound[]>([]);
  const [participants, setParticipants] = useState<ColorParticipant[]>([]);
  const [guesses, setGuesses] = useState<ColorGuess[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isHostFullscreen, setIsHostFullscreen] = useState(false);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load initial game data
  const loadGameData = async () => {
    try {
      const { data: g, error: ge } = await supabase
        .from('color_games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (ge || !g) {
        console.error('Error fetching color game:', ge);
        return;
      }
      setGame(g as ColorGame);

      const { data: r } = await supabase
        .from('color_rounds')
        .select('*')
        .eq('game_id', gameId)
        .order('round_number', { ascending: true });
      if (r) setRounds(r as ColorRound[]);

      const { data: p } = await supabase
        .from('color_participants')
        .select('*')
        .eq('game_id', gameId)
        .order('participant_number', { ascending: true });
      if (p) setParticipants(p as ColorParticipant[]);

      const { data: gu } = await supabase
        .from('color_guesses')
        .select('*')
        .eq('game_id', gameId);
      if (gu) setGuesses(gu as ColorGuess[]);
    } catch (err) {
      console.error('Failed to load color game:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGameData();

    // Supabase Realtime Subscriptions
    const gameChannel = supabase
      .channel(`color_host_${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'color_games', filter: `id=eq.${gameId}` },
        (payload) => {
          if (payload.new) {
            setGame(payload.new as ColorGame);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'color_participants', filter: `game_id=eq.${gameId}` },
        () => {
          // Reload participants to keep order and scores in sync
          supabase
            .from('color_participants')
            .select('*')
            .eq('game_id', gameId)
            .order('participant_number', { ascending: true })
            .then(({ data }) => {
              if (data) setParticipants(data as ColorParticipant[]);
            });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'color_guesses', filter: `game_id=eq.${gameId}` },
        () => {
          // Reload guesses
          supabase
            .from('color_guesses')
            .select('*')
            .eq('game_id', gameId)
            .then(({ data }) => {
              if (data) setGuesses(data as ColorGuess[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId]);

  // Host Action: Start Memorize Phase
  const handleStartMemorize = async () => {
    if (!game) return;
    const { error } = await supabase
      .from('color_games')
      .update({
        status: 'memorize',
        started_at: game.started_at || new Date().toISOString()
      })
      .eq('id', gameId);

    if (error) {
      alert('Gagal memulai fase mengingat: ' + error.message);
    } else {
      setGame(prev => prev ? { ...prev, status: 'memorize' } : null);
    }
  };

  // Host Action: Start Guessing (Playing Phase, Round 1)
  const handleStartGuessing = async () => {
    if (!game) return;
    setShowRoundResult(false);
    const { error } = await supabase
      .from('color_games')
      .update({
        status: 'playing',
        current_round: 1
      })
      .eq('id', gameId);

    if (error) {
      alert('Gagal memulai tebak warna: ' + error.message);
    } else {
      setGame(prev => prev ? { ...prev, status: 'playing', current_round: 1 } : null);
    }
  };

  // Host Action: Advance to next round or finish
  const handleNextRound = async () => {
    if (!game) return;
    setShowRoundResult(false);

    if (game.current_round >= game.total_rounds) {
      // Finish game
      const { error } = await supabase
        .from('color_games')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (error) {
        alert('Gagal menyelesaikan game: ' + error.message);
      } else {
        setGame(prev => prev ? { ...prev, status: 'finished' } : null);
      }
    } else {
      // Next round
      const nextRoundNum = game.current_round + 1;
      const { error } = await supabase
        .from('color_games')
        .update({
          current_round: nextRoundNum,
          status: 'playing'
        })
        .eq('id', gameId);

      if (error) {
        alert('Gagal berpindah ronde: ' + error.message);
      } else {
        setGame(prev => prev ? { ...prev, current_round: nextRoundNum, status: 'playing' } : null);
      }
    }
  };

  const handleCloseGame = async () => {
    if (!window.confirm('Tutup room Tebak Warna ini? Siswa tidak akan dapat mengakses room ini lagi.')) return;
    await supabase.from('color_games').update({ status: 'closed' }).eq('id', gameId);
    onExit();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsHostFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsHostFullscreen(false);
    }
  };

  const handleCopyLink = () => {
    if (!game) return;
    const url = `${window.location.origin}/#/game/color/join/${game.room_code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPin = () => {
    if (!game) return;
    navigator.clipboard.writeText(game.pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  if (loading || !game) {
    return (
      <div className="p-12 text-center font-body">
        <div className="text-4xl animate-bounce mb-3">🎨</div>
        <h3 className="text-lg font-black uppercase text-gray-900 font-display">MEMUAT ROOM TEBAK WARNA...</h3>
      </div>
    );
  }

  const currentRoundData = rounds.find(r => r.round_number === game.current_round);
  const currentRoundGuesses = guesses.filter(g => g.round_id === currentRoundData?.id);
  const submittedCount = currentRoundGuesses.length;
  const totalParticipants = participants.length;

  // Leaderboard sorted by total_score DESC, rounds_completed DESC
  const leaderboard = [...participants].sort((a, b) => {
    if ((b.total_score || 0) !== (a.total_score || 0)) {
      return (b.total_score || 0) - (a.total_score || 0);
    }
    return (b.rounds_completed || 0) - (a.rounds_completed || 0);
  });

  const p1 = leaderboard[0];
  const p2 = leaderboard[1];
  const p3 = leaderboard[2];

  const modeBadge = (
    <span className={`px-3 py-1 rounded-full border-2 border-gray-900 font-black text-xs uppercase tracking-wider ${
      game.mode === 'easy' ? 'bg-[#C1F2D0] text-emerald-950' :
      game.mode === 'medium' ? 'bg-[#FFD166] text-amber-950' :
      'bg-[#FF8B7B] text-rose-950'
    }`}>
      MODE {game.mode.toUpperCase()}
    </span>
  );

  return (
    <div 
      ref={containerRef}
      className={`space-y-6 font-body pb-12 ${
        isHostFullscreen ? 'fixed inset-0 z-50 bg-[#FAF6F0] p-4 md:p-8 overflow-y-auto' : ''
      }`}
    >
      {/* ========================================================================= */}
      {/* HEADER CONTROLS */}
      {/* ========================================================================= */}
      <div className="p-5 bg-white rounded-3xl border-3 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 border-2 border-gray-900 rounded-xl cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)]"
            title="Kembali ke Daftar Game"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 bg-[#FFD166] rounded-lg border-2 border-gray-900 font-display font-black text-xs">
                🎨 TEBAK WARNA
              </span>
              {modeBadge}
              <span className={`px-2.5 py-0.5 rounded-full border border-gray-900 text-[10px] font-black uppercase ${
                game.status === 'waiting' ? 'bg-[#FFD166] text-gray-900' :
                game.status === 'memorize' ? 'bg-[#B4D3FF] text-gray-900' :
                game.status === 'playing' ? 'bg-[#C1F2D0] text-gray-900' :
                'bg-gray-200 text-gray-700'
              }`}>
                {game.status === 'waiting' ? 'LOBBY' :
                 game.status === 'memorize' ? 'FASE INGAT WARNA' :
                 game.status === 'playing' ? `RONDE ${game.current_round} / ${game.total_rounds}` :
                 'SELESAI'}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black font-display text-gray-900 uppercase tracking-tight mt-1">
              {game.title}
            </h2>
          </div>
        </div>

        {/* PIN, CODE & ACTIONS */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 text-center">
            <span className="text-[9px] font-black uppercase text-gray-400 block leading-none">PIN</span>
            <span className="text-xl font-black text-gray-900 font-display tracking-wider leading-none">
              {game.pin}
            </span>
          </div>

          <div className="px-3.5 py-1.5 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 text-center">
            <span className="text-[9px] font-black uppercase text-gray-400 block leading-none">KODE</span>
            <span className="text-xl font-black text-blue-600 font-display tracking-wider leading-none">
              {game.room_code}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="px-3.5 py-2.5 bg-[#FFD166] hover:bg-yellow-300 text-gray-900 border-2 border-gray-900 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            title="Tampilkan Fullscreen ke Layar / TV"
          >
            {isHostFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isHostFullscreen ? 'EXIT' : 'FULLSCREEN'}</span>
          </button>

          {game.status !== 'closed' && (
            <button
              onClick={handleCloseGame}
              className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-700 rounded-xl text-xs font-black uppercase cursor-pointer"
            >
              Tutup Room
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FASE 1: WAITING (LOBBY) */}
      {/* ========================================================================= */}
      {game.status === 'waiting' && (
        <div className="space-y-6">
          <div className="p-8 bg-[#FFD166] rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] text-center space-y-5">
            <span className="inline-block px-4 py-1 bg-white rounded-full border-2 border-gray-900 text-xs font-black uppercase tracking-wider">
              RUANG TUNGGU TEBAK WARNA • {participants.length} PESERTA TERHUBUNG
            </span>

            <div>
              <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight text-gray-900">
                GABUNG GAME: PIN {game.pin}
              </h1>
              <p className="text-sm md:text-base font-bold text-gray-800 mt-2 max-w-xl mx-auto">
                Buka tautan kuis warna atau masukkan PIN dan Nama untuk mulai.
              </p>
            </div>

            {/* Quick Share Box */}
            <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
              <button
                onClick={handleCopyLink}
                className="py-3 px-6 bg-white hover:bg-gray-100 text-gray-900 border-2 border-gray-900 rounded-2xl font-black text-xs uppercase cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'LINK DISALIN!' : 'SALIN LINK GABUNG'}</span>
              </button>

              <button
                onClick={handleCopyPin}
                className="py-3 px-6 bg-white hover:bg-gray-100 text-gray-900 border-2 border-gray-900 rounded-2xl font-black text-xs uppercase cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
              >
                {copiedPin ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPin ? 'PIN DISALIN!' : `SALIN PIN (${game.pin})`}</span>
              </button>
            </div>

            {/* Start Button */}
            <div className="pt-4 flex justify-center">
              <button
                onClick={handleStartMemorize}
                disabled={participants.length === 0}
                className="py-4 px-10 bg-[#C1F2D0] hover:bg-emerald-300 disabled:opacity-40 text-gray-900 border-3 border-gray-900 rounded-2xl font-black text-base md:text-lg uppercase tracking-wider cursor-pointer shadow-[4px_4px_0_rgba(0,0,0,1)] flex items-center gap-3 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <Play className="w-6 h-6 fill-gray-900" />
                <span>MULAI FASE MENGINGAT (5 WARNA)</span>
              </button>
            </div>
          </div>

          {/* Connected Participants Grid */}
          <div className="p-6 bg-white rounded-3xl border-3 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>DAFTAR PESERTA DI LOBBY ({participants.length})</span>
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
                    {String(p.participant_number).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-black text-gray-900 truncate" title={p.participant_name}>
                    {p.participant_name}
                  </span>
                </div>
              ))}
              {participants.length === 0 && (
                <div className="col-span-full py-8 text-center text-gray-500 font-bold">
                  Belum ada peserta. Bagikan PIN <span className="font-mono">{game.pin}</span> kepada siswa!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FASE 2: MEMORIZE (INGAT 5 WARNA TARGET) */}
      {/* ========================================================================= */}
      {game.status === 'memorize' && (
        <div className="space-y-6">
          <div className="p-8 bg-white rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] text-center space-y-6">
            <div>
              <span className="inline-block px-4 py-1 bg-[#FFD166] rounded-full border-2 border-gray-900 text-xs font-black uppercase mb-2">
                FASE 1: MENGINGAT 5 WARNA TARGET
              </span>
              <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight text-gray-900">
                INGAT 5 WARNA BERIKUT DENGAN SEKSAMA!
              </h1>
              <p className="text-sm md:text-base font-bold text-gray-600 mt-2 max-w-xl mx-auto">
                Setelah fase ini dimulai, warna akan disembunyikan dan semua peserta akan menebak warna ronde demi ronde.
              </p>
            </div>

            {/* 5 COLOR TARGET CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto pt-2">
              {rounds.map((r, idx) => (
                <div
                  key={r.id}
                  className="bg-[#FAF6F0] rounded-2xl border-3 border-gray-900 p-3 space-y-3 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col items-center"
                >
                  <span className="px-3 py-1 bg-white rounded-full border-2 border-gray-900 text-xs font-black uppercase text-gray-900">
                    WARNA {idx + 1}
                  </span>
                  
                  {/* Swatch */}
                  <div
                    className="w-full h-32 md:h-44 rounded-xl border-3 border-gray-900 shadow-inner flex items-center justify-center transition-transform hover:scale-105"
                    style={{ backgroundColor: r.target_color }}
                  />

                  {/* Optional info for host */}
                  <div className="text-[11px] font-mono font-bold text-gray-600">
                    {r.target_color}
                  </div>
                </div>
              ))}
            </div>

            {/* Host Advance Button */}
            <div className="pt-6 flex justify-center">
              <button
                onClick={handleStartGuessing}
                className="py-4 px-10 bg-[#FFD166] hover:bg-yellow-300 text-gray-900 border-3 border-gray-900 rounded-2xl font-black text-lg uppercase tracking-wider cursor-pointer shadow-[5px_5px_0_rgba(0,0,0,1)] flex items-center gap-3 active:translate-x-0.5 active:translate-y-0.5"
              >
                <Sparkles className="w-6 h-6" />
                <span>MULAI MENEBAK (SEMBUNYIKAN WARNA)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FASE 3: PLAYING (TEBAK WARNA - RONDE 1 SD 5) */}
      {/* ========================================================================= */}
      {game.status === 'playing' && currentRoundData && (
        <div className="space-y-6">
          <div className="p-8 bg-white rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b-2 border-gray-200 pb-4">
              <div>
                <span className="px-3.5 py-1 bg-[#FF8B7B] rounded-full border-2 border-gray-900 text-xs font-black uppercase text-gray-900 shadow-[2px_2px_0_rgba(0,0,0,1)]">
                  RONDE {game.current_round} DARI {game.total_rounds}
                </span>
                <h2 className="text-2xl md:text-3xl font-black font-display uppercase text-gray-900 mt-2">
                  TEBAK WARNA NOMOR {game.current_round}
                </h2>
                <p className="text-xs md:text-sm font-bold text-gray-600 mt-0.5">
                  Warna target telah disembunyikan di layar peserta. Peserta sedang mencampur warna.
                </p>
              </div>

              {/* Host Target Color Peek (Host Only) */}
              <div className="p-3 bg-[#FAF6F0] rounded-2xl border-2 border-gray-900 flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl border-2 border-gray-900 shadow-xs"
                  style={{ backgroundColor: currentRoundData.target_color }}
                />
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-500 block">KUNCI TARGET (HOST)</span>
                  <span className="text-xs font-mono font-black text-gray-900">{currentRoundData.target_color}</span>
                  <div className="text-[10px] font-mono text-gray-600">
                    R:{currentRoundData.target_r} G:{currentRoundData.target_g} B:{currentRoundData.target_b}
                  </div>
                </div>
              </div>
            </div>

            {/* PROGRESS & LIVE SUBMISSIONS COUNTER */}
            <div className="p-6 bg-[#FAF6F0] rounded-2xl border-2 border-gray-900 space-y-3">
              <div className="flex items-center justify-between text-sm font-black uppercase text-gray-900">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>STATUS JAWABAN PESERTA</span>
                </span>
                <span className="text-base font-display">
                  {submittedCount} / {totalParticipants} PESERTA MENJAWAB
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-4 w-full bg-white rounded-full border-2 border-gray-900 overflow-hidden">
                <div 
                  className="h-full bg-[#C1F2D0] border-r-2 border-gray-900 transition-all duration-300"
                  style={{ width: `${totalParticipants > 0 ? (submittedCount / totalParticipants) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* PARTICIPANTS ANSWER STATUS GRID */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                DAFTAR PESERTA & STATUS PENGIRIMAN:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[30vh] overflow-y-auto p-1">
                {participants.map((p) => {
                  const guess = currentRoundGuesses.find(g => g.participant_id === p.id);
                  const isSubmitted = !!guess;

                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-xl border-2 border-gray-900 flex items-center justify-between gap-2 shadow-[2px_2px_0_rgba(0,0,0,1)] ${
                        isSubmitted ? 'bg-emerald-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-7 h-7 rounded-lg border border-gray-900 flex items-center justify-center font-black text-xs ${
                          isSubmitted ? 'bg-[#C1F2D0]' : 'bg-gray-100'
                        }`}>
                          {String(p.participant_number).padStart(2, '0')}
                        </span>
                        <span className="text-xs font-black text-gray-900 truncate" title={p.participant_name}>
                          {p.participant_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isSubmitted ? (
                          <div className="flex items-center gap-1.5">
                            {/* Color preview dot */}
                            <div 
                              className="w-5 h-5 rounded-full border border-gray-900 shadow-xs"
                              style={{ backgroundColor: guess.guessed_color }}
                              title={`Tebakan: ${guess.guessed_color}`}
                            />
                            <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              {guess.score.toFixed(1)} pt
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 italic">
                            Memilih...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ROUND RESULT TOGGLE / SUMMARY */}
            {showRoundResult && (
              <div className="p-6 bg-[#FAF6F0] rounded-2xl border-3 border-gray-900 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black uppercase tracking-wider text-gray-900">
                    HASIL RONDE {game.current_round}: TARGET VS RATA-RATA TEBAKAN
                  </h3>
                </div>

                <div className="flex items-center justify-center gap-8 flex-wrap py-4">
                  {/* Target Color */}
                  <div className="text-center space-y-2">
                    <span className="text-xs font-black uppercase text-gray-700 block">WARNA TARGET</span>
                    <div 
                      className="w-24 h-24 rounded-2xl border-3 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] mx-auto"
                      style={{ backgroundColor: currentRoundData.target_color }}
                    />
                    <div className="font-mono font-black text-sm text-gray-900">{currentRoundData.target_color}</div>
                  </div>

                  {/* Leader of this round */}
                  {currentRoundGuesses.length > 0 && (() => {
                    const bestGuess = [...currentRoundGuesses].sort((a, b) => b.score - a.score)[0];
                    const bestPart = participants.find(p => p.id === bestGuess.participant_id);
                    return (
                      <div className="text-center space-y-2">
                        <span className="text-xs font-black uppercase text-emerald-700 block">⭐ TEBAKAN PALING AKURAT</span>
                        <div 
                          className="w-24 h-24 rounded-2xl border-3 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] mx-auto"
                          style={{ backgroundColor: bestGuess.guessed_color }}
                        />
                        <div className="font-bold text-xs text-gray-900 truncate max-w-[120px]">
                          {bestPart?.participant_name} ({bestGuess.score.toFixed(2)}/10)
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ACTION CONTROLS */}
            <div className="pt-4 flex items-center justify-between flex-wrap gap-4 border-t-2 border-gray-200">
              <button
                onClick={() => setShowRoundResult(prev => !prev)}
                className="py-3 px-5 bg-white hover:bg-gray-100 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)] flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>{showRoundResult ? 'SEMBUNYIKAN HASIL RONDE' : 'TAMPILKAN HASIL RONDE'}</span>
              </button>

              <button
                onClick={handleNextRound}
                className="py-3.5 px-8 bg-[#FFD166] hover:bg-yellow-300 text-gray-900 border-3 border-gray-900 rounded-2xl font-black text-sm uppercase tracking-wider cursor-pointer shadow-[4px_4px_0_rgba(0,0,0,1)] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
              >
                <span>
                  {game.current_round >= game.total_rounds ? 'SELESAIKAN GAME & LIHAT PODIUM' : `LANJUT KE RONDE ${game.current_round + 1}`}
                </span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FASE 5: FINISHED (PODIUM TOP 3 & LEADERBOARD) */}
      {/* ========================================================================= */}
      {(game.status === 'finished' || game.status === 'closed') && (
        <div className="space-y-8">
          <div className="p-8 md:p-12 bg-white rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] text-center space-y-6">
            <div>
              <span className="inline-block px-4 py-1 bg-[#FFD166] rounded-full border-2 border-gray-900 text-xs font-black uppercase mb-2 shadow-[2px_2px_0_rgba(0,0,0,1)]">
                🏆 TEBAK WARNA SELESAI
              </span>
              <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight text-gray-900">
                PAPAN PERINGKAT JUARA
              </h1>
              <p className="text-sm font-bold text-gray-600 mt-1">
                Selamat kepada seluruh peserta atas partisipasinya! Skor maksimal adalah 50.00 PTS.
              </p>
            </div>

            {/* STEPPED PODIUM FOR TOP 3 */}
            <div className="pt-8 flex flex-col md:flex-row items-end justify-center gap-4 max-w-2xl mx-auto">
              {/* 2nd Place (Juara 2 - Kiri) */}
              <div className="w-full md:w-1/3 flex flex-col items-center order-2 md:order-1">
                {p2 ? (
                  <div className="w-full space-y-2 text-center animate-fade-in">
                    <div className="text-3xl">🥈</div>
                    <span className="px-3 py-0.5 bg-[#B4D3FF] border border-gray-900 rounded-full text-xs font-black uppercase text-gray-900">
                      JUARA 2
                    </span>
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-900 mx-auto shadow-[2px_2px_0_rgba(0,0,0,1)]">
                      {String(p2.participant_number).padStart(2, '0')}
                    </div>
                    <div className="text-sm font-black text-gray-900 truncate px-2" title={p2.participant_name}>
                      {p2.participant_name}
                    </div>
                    <div className="text-lg font-black font-display text-gray-900">
                      {Number(p2.total_score || 0).toFixed(2)} <span className="text-xs">/ 50</span>
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

              {/* 1st Place (Juara 1 - Tengah & Paling Tinggi) */}
              <div className="w-full md:w-1/3 flex flex-col items-center order-1 md:order-2 -mt-6">
                {p1 ? (
                  <div className="w-full space-y-2 text-center animate-bounce-short">
                    <div className="text-5xl">🥇</div>
                    <span className="px-4 py-1 bg-[#FFD166] border-2 border-gray-900 rounded-full text-xs font-black uppercase text-gray-900 shadow-[2px_2px_0_rgba(0,0,0,1)]">
                      JUARA 1
                    </span>
                    <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-base text-gray-900 mx-auto shadow-[2px_2px_0_rgba(0,0,0,1)]">
                      {String(p1.participant_number).padStart(2, '0')}
                    </div>
                    <div className="text-base md:text-lg font-black text-gray-900 truncate px-2" title={p1.participant_name}>
                      {p1.participant_name}
                    </div>
                    <div className="text-2xl font-black font-display text-gray-900">
                      {Number(p1.total_score || 0).toFixed(2)} <span className="text-xs">/ 50</span>
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

              {/* 3rd Place (Juara 3 - Kanan) */}
              <div className="w-full md:w-1/3 flex flex-col items-center order-3">
                {p3 ? (
                  <div className="w-full space-y-2 text-center animate-fade-in">
                    <div className="text-3xl">🥉</div>
                    <span className="px-3 py-0.5 bg-[#FF8B7B] border border-gray-900 rounded-full text-xs font-black uppercase text-gray-900">
                      JUARA 3
                    </span>
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center font-black text-sm text-gray-900 mx-auto shadow-[2px_2px_0_rgba(0,0,0,1)]">
                      {String(p3.participant_number).padStart(2, '0')}
                    </div>
                    <div className="text-sm font-black text-gray-900 truncate px-2" title={p3.participant_name}>
                      {p3.participant_name}
                    </div>
                    <div className="text-lg font-black font-display text-gray-900">
                      {Number(p3.total_score || 0).toFixed(2)} <span className="text-xs">/ 50</span>
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

            {/* FULL LEADERBOARD TABLE */}
            <div className="pt-6 max-w-3xl mx-auto space-y-3 text-left">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>KLASEMEN LENGKAP PESERTA ({leaderboard.length})</span>
              </h4>

              <div className="bg-[#FAF6F0] rounded-2xl border-2 border-gray-900 overflow-hidden shadow-[3px_3px_0_rgba(0,0,0,1)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFD166] border-b-2 border-gray-900 font-black uppercase text-gray-900">
                    <tr>
                      <th className="p-3 w-16 text-center">RANK</th>
                      <th className="p-3 w-16 text-center">NO</th>
                      <th className="p-3">NAMA PESERTA</th>
                      <th className="p-3 text-center">RONDE</th>
                      <th className="p-3 text-right">TOTAL SKOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-bold">
                    {leaderboard.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-white transition-colors">
                        <td className="p-3 text-center font-black">
                          {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {String(p.participant_number).padStart(2, '0')}
                        </td>
                        <td className="p-3 font-black text-gray-900">{p.participant_name}</td>
                        <td className="p-3 text-center">{p.rounds_completed || 0}/5</td>
                        <td className="p-3 text-right font-black font-display text-sm text-gray-900">
                          {Number(p.total_score || 0).toFixed(2)} <span className="text-[10px] text-gray-500">PTS</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom button */}
            <div className="pt-6 flex justify-center">
              <button
                onClick={onExit}
                className="py-3.5 px-8 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-wider cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)]"
              >
                KEMBALI KE MENU GAME
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
