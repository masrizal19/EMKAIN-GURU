/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Palette, Plus, Users, Play, Trophy, Copy, CheckCircle2, 
  Trash2, ArrowRight, ExternalLink, Sparkles, RefreshCw,
  AlertCircle, ChevronRight, Layers, ShieldCheck
} from 'lucide-react';
import { UserProfile, ColorGame, ColorGameMode } from '../../types';
import { supabase } from '../../lib/supabase';
import { ColorTeacherGameRoom } from './ColorTeacherGameRoom';

interface ColorGameCenterProps {
  profile: UserProfile;
  onBackToDashboard: () => void;
  onSwitchToQuizGame?: () => void;
}

export const ColorGameCenter: React.FC<ColorGameCenterProps> = ({
  profile,
  onBackToDashboard,
  onSwitchToQuizGame
}) => {
  const [games, setGames] = useState<ColorGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // Create Modal / Form state
  const [isCreating, setIsCreating] = useState(false);
  const [gameTitle, setGameTitle] = useState('');
  const [selectedMode, setSelectedMode] = useState<ColorGameMode>('easy');
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadGames = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('color_games')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile.role !== 'admin') {
        query = query.eq('creator_id', profile.id);
      }

      const { data, error: err } = await query;
      if (err) {
        setError(err.message);
      } else if (data) {
        setGames(data as ColorGame[]);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memuat game warna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeGameId) {
      loadGames();
    }
  }, [activeGameId]);

  // Handle Create Game using database RPC create_color_game
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    console.log('CREATE COLOR GAME START', {
      mode: selectedMode,
      totalRounds: 5
    });

    try {
      // 1. Validasi guru sudah login & ambil user ID dari supabase.auth.getUser()
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('COLOR CREATE AUTH ERROR:', authError);
        setError('Anda harus login sebagai guru untuk membuat room.');
        setSubmitting(false);
        return;
      }

      const title = gameTitle.trim() || 'TEBAK WARNA';

      // 2. Eksekusi RPC create_color_game (SECURITY DEFINER dengan auth.uid())
      const { data, error: rpcError } = await supabase.rpc(
        'create_color_game',
        {
          p_title: title,
          p_mode: selectedMode, // 'easy' | 'medium' | 'hard'
          p_total_rounds: 5
        }
      );

      console.log('CREATE COLOR GAME RESULT', {
        data,
        error: rpcError
      });

      // 3. Validasi kegagalan RPC
      if (rpcError || !data) {
        console.error('COLOR GAME CREATE RPC ERROR:', rpcError);
        setError(rpcError?.message || 'Gagal membuat room game di database.');
        setSubmitting(false);
        return;
      }

      const parsedData = Array.isArray(data) ? data[0] : data;
      if (parsedData.success === false) {
        setError(parsedData.error || parsedData.message || 'Gagal membuat room game.');
        setSubmitting(false);
        return;
      }

      const createdGameId = parsedData.game_id || parsedData.id;

      if (!createdGameId) {
        setError('ID Game tidak valid dari database.');
        setSubmitting(false);
        return;
      }

      // 4. BARU tampilkan room berhasil dibuat kepada guru setelah RPC database mengembalikan row asli
      setIsCreating(false);
      setGameTitle('');
      setActiveGameId(createdGameId);

    } catch (err: any) {
      console.error('COLOR CREATE UNEXPECTED ERROR:', err);
      setError(err.message || 'Terjadi kesalahan saat membuat game tebak warna.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (game: ColorGame) => {
    const url = `${window.location.origin}/#/game/color/join/${game.room_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(game.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDeleteGame = async (gameId: string, title: string) => {
    if (!window.confirm(`Hapus game "${title}"? Seluruh ronde dan jawaban peserta akan dihapus.`)) {
      return;
    }
    setDeletingId(gameId);
    try {
      // Cascade delete: rounds, participants, guesses, then game
      await supabase.from('color_guesses').delete().eq('game_id', gameId);
      await supabase.from('color_participants').delete().eq('game_id', gameId);
      await supabase.from('color_rounds').delete().eq('game_id', gameId);
      const { error: delErr } = await supabase.from('color_games').delete().eq('id', gameId);

      if (delErr) {
        alert('Gagal menghapus game: ' + delErr.message);
      } else {
        setGames(prev => prev.filter(g => g.id !== gameId));
      }
    } catch (err: any) {
      alert('Error saat menghapus game: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // If in active room view
  if (activeGameId) {
    return (
      <ColorTeacherGameRoom
        gameId={activeGameId}
        profile={profile}
        onExit={() => setActiveGameId(null)}
      />
    );
  }

  return (
    <div className="space-y-6 font-body pb-12">
      {/* ========================================================================= */}
      {/* TOP BANNER & NAVIGATION */}
      {/* ========================================================================= */}
      <div className="p-6 md:p-8 bg-[#FAF6F0] rounded-3xl border-3 border-gray-900 shadow-[5px_5px_0_rgba(0,0,0,1)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFD166] border-2 border-gray-900 flex items-center justify-center text-2xl shadow-[2px_2px_0_rgba(0,0,0,1)]">
              🎨
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                EMKAIN GURU • GAME REALTIME
              </span>
              <h1 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-gray-900">
                TEBAK WARNA
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onSwitchToQuizGame && (
              <button
                onClick={onSwitchToQuizGame}
                className="py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)]"
              >
                🎮 KUIS PILIHAN GANDA
              </button>
            )}

            <button
              onClick={() => setIsCreating(true)}
              className="py-2.5 px-5 bg-[#FFD166] hover:bg-yellow-300 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>BUAT ROOM TEBAK WARNA</span>
            </button>
          </div>
        </div>

        <p className="text-xs md:text-sm font-bold text-gray-600 max-w-2xl leading-relaxed">
          Siswa melihat 5 warna target selama fase mengingat, lalu berusaha merekonstruksi warna yang tepat di setiap ronde menggunakan color picker. Skor dinilai otomatis berdasarkan kedekatan RGB.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border-2 border-red-700 text-red-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / PANEL BUAT ROOM TEBAK WARNA */}
      {/* ========================================================================= */}
      {isCreating && (
        <div className="p-6 md:p-8 bg-white rounded-3xl border-3 border-gray-900 shadow-[6px_6px_0_rgba(0,0,0,1)] space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b-2 border-gray-200 pb-3">
            <h2 className="text-xl font-black font-display uppercase tracking-tight text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>BUAT ROOM TEBAK WARNA BARU</span>
            </h2>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs font-black uppercase text-gray-400 hover:text-gray-900"
            >
              Tutup ✕
            </button>
          </div>

          <form onSubmit={handleCreateGame} className="space-y-6">
            {/* Judul Room */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-gray-800 tracking-wider">
                JUDUL ROOM (OPSIONAL)
              </label>
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                placeholder="Contoh: Tebak Warna Seni Budaya X TKJ"
                className="w-full px-4 py-3 bg-[#FAF6F0] rounded-xl border-2 border-gray-900 font-bold text-sm focus:outline-none focus:bg-white focus:shadow-[2px_2px_0_rgba(0,0,0,1)]"
              />
            </div>

            {/* Pilihan Mode Tingkat Kesulitan */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-800 tracking-wider block">
                PILIH TINGKAT KESULITAN (MODE):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* EASY */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('easy')}
                  className={`p-4 rounded-2xl border-3 text-left transition-all cursor-pointer ${
                    selectedMode === 'easy'
                      ? 'bg-[#C1F2D0] border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] translate-x-0.5'
                      : 'bg-white border-gray-300 hover:border-gray-900 text-gray-700'
                  }`}
                >
                  <span className="inline-block px-2.5 py-0.5 bg-white rounded-full border border-gray-900 text-[10px] font-black uppercase mb-1.5">
                    MUDAH
                  </span>
                  <div className="text-base font-black uppercase font-display text-gray-900">
                    [ EASY ]
                  </div>
                  <p className="text-[11px] font-bold text-gray-600 mt-1">
                    5 warna cerah & kontras tinggi dengan rona primer/sekunder yang jelas.
                  </p>
                </button>

                {/* MEDIUM */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('medium')}
                  className={`p-4 rounded-2xl border-3 text-left transition-all cursor-pointer ${
                    selectedMode === 'medium'
                      ? 'bg-[#FFD166] border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] translate-x-0.5'
                      : 'bg-white border-gray-300 hover:border-gray-900 text-gray-700'
                  }`}
                >
                  <span className="inline-block px-2.5 py-0.5 bg-white rounded-full border border-gray-900 text-[10px] font-black uppercase mb-1.5">
                    SEDANG
                  </span>
                  <div className="text-base font-black uppercase font-display text-gray-900">
                    [ MEDIUM ]
                  </div>
                  <p className="text-[11px] font-bold text-gray-600 mt-1">
                    Warna pastel, nada tanah, dan saturasi bervariasi yang memerlukan konsentrasi.
                  </p>
                </button>

                {/* HARD */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('hard')}
                  className={`p-4 rounded-2xl border-3 text-left transition-all cursor-pointer ${
                    selectedMode === 'hard'
                      ? 'bg-[#FF8B7B] border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] translate-x-0.5'
                      : 'bg-white border-gray-300 hover:border-gray-900 text-gray-700'
                  }`}
                >
                  <span className="inline-block px-2.5 py-0.5 bg-white rounded-full border border-gray-900 text-[10px] font-black uppercase mb-1.5">
                    SULIT
                  </span>
                  <div className="text-base font-black uppercase font-display text-gray-900">
                    [ HARD ]
                  </div>
                  <p className="text-[11px] font-bold text-gray-600 mt-1">
                    Nuansa halus, gradasi lembut, dan rona dekat yang menantang presisi mata.
                  </p>
                </button>
              </div>
            </div>

            {/* Submit / Cancel Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-black text-xs uppercase cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="py-3.5 px-8 bg-[#C1F2D0] hover:bg-emerald-300 disabled:opacity-50 text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] flex items-center gap-2"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-gray-900" />}
                <span>{submitting ? 'MEMBUAT ROOM...' : 'BUAT ROOM & BUKA LOBBY'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DAFTAR ROOM TEBAK WARNA */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base md:text-lg font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>DAFTAR ROOM TEBAK WARNA SAYA ({games.length})</span>
          </h3>

          <button
            onClick={loadGames}
            className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 cursor-pointer"
            title="Muat Ulang Daftar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 font-bold">
            Memuat daftar game tebak warna...
          </div>
        ) : games.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border-3 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] text-center space-y-4">
            <div className="text-4xl">🎨</div>
            <div className="space-y-1">
              <h4 className="text-lg font-black uppercase text-gray-900 font-display">
                BELUM ADA ROOM TEBAK WARNA
              </h4>
              <p className="text-xs font-bold text-gray-500 max-w-md mx-auto">
                Buat room Tebak Warna pertama Anda untuk mengajak siswa melatih persepsi visual dan pencampuran warna secara seru!
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="py-3 px-6 bg-[#FFD166] text-gray-900 border-2 border-gray-900 rounded-xl font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,1)]"
            >
              + BUAT ROOM SEKARANG
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((g) => (
              <div
                key={g.id}
                className="p-5 bg-white rounded-2xl border-3 border-gray-900 shadow-[4px_4px_0_rgba(0,0,0,1)] space-y-4 flex flex-col justify-between hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full border border-gray-900 text-[10px] font-black uppercase ${
                      g.mode === 'easy' ? 'bg-[#C1F2D0] text-emerald-950' :
                      g.mode === 'medium' ? 'bg-[#FFD166] text-amber-950' :
                      'bg-[#FF8B7B] text-rose-950'
                    }`}>
                      MODE {g.mode.toUpperCase()}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      g.status === 'waiting' ? 'bg-amber-100 text-amber-800' :
                      g.status === 'memorize' ? 'bg-blue-100 text-blue-800' :
                      g.status === 'playing' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {g.status === 'waiting' ? 'LOBBY' :
                       g.status === 'memorize' ? 'INGAT WARNA' :
                       g.status === 'playing' ? `RONDE ${g.current_round}/5` :
                       'SELESAI'}
                    </span>
                  </div>

                  <h4 className="text-base font-black font-display text-gray-900 line-clamp-2 uppercase">
                    {g.title}
                  </h4>

                  {/* Room Details */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2 bg-[#FAF6F0] rounded-lg border border-gray-300">
                      <span className="text-[9px] font-black uppercase text-gray-400 block">KODE ROOM</span>
                      <span className="font-mono font-black text-blue-600 text-sm">{g.room_code}</span>
                    </div>

                    <div className="p-2 bg-[#FAF6F0] rounded-lg border border-gray-300">
                      <span className="text-[9px] font-black uppercase text-gray-400 block">PIN ROOM</span>
                      <span className="font-mono font-black text-gray-900 text-sm">{g.pin}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-gray-200 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleDeleteGame(g.id, g.title)}
                    disabled={deletingId === g.id}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                    title="Hapus Game"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyLink(g)}
                      className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === g.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === g.id ? 'Disalin' : 'Link'}</span>
                    </button>

                    <button
                      onClick={() => setActiveGameId(g.id)}
                      className="py-2 px-3.5 bg-[#FFD166] hover:bg-yellow-300 text-gray-900 border border-gray-900 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-gray-900" />
                      <span>BUKA HOST</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
