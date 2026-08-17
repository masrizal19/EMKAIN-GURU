/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserProfile } from '../types';
import { X, MessageSquare, School, BookOpen, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (targetUser: UserProfile) => void;
  currentUserId?: string;
}

export default function UserProfileModal({
  user,
  isOpen,
  onClose,
  onStartChat,
  currentUserId
}: UserProfileModalProps) {
  if (!isOpen || !user) return null;

  const isSelf = user.id === currentUserId;
  const isAdmin = user.role === 'admin' || (user.email || '').toLowerCase().trim() === 'admin@gmail.com';

  const formatLastSeen = (lastSeen?: string | null, isOnline?: boolean) => {
    if (isOnline) return 'Sedang aktif sekarang';
    if (!lastSeen) return 'Belum ada data aktivitas';
    try {
      const diffMs = Date.now() - new Date(lastSeen).getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) return 'Baru saja';
      if (diffMinutes < 60) return `Terakhir aktif ${diffMinutes} menit lalu`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `Terakhir aktif ${diffHours} jam lalu`;
      return `Terakhir aktif ${new Date(lastSeen).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return 'Offline';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" id="user-profile-modal-overlay">
      <div className="w-full max-w-md bg-[#FAF6F0] rounded-3xl neo-border neo-shadow-lg overflow-hidden relative">
        {/* Header decoration banner */}
        <div className="h-24 bg-[#B4D3FF] border-b-[3.5px] border-gray-900 relative p-4 flex justify-end">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white neo-border-thin flex items-center justify-center text-gray-800 hover:bg-gray-100 cursor-pointer shadow-sm"
            id="close-profile-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="px-6 pb-6 pt-0 relative -mt-12 text-center space-y-4">
          {/* Avatar with Presence Indicator */}
          <div className="relative inline-block mx-auto">
            <div className="w-24 h-24 rounded-full bg-[#FFD166] neo-border flex items-center justify-center text-5xl shadow-md">
              {user.avatar_url || (isAdmin ? '🛡️' : '👩‍🏫')}
            </div>
            <div
              className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-[3px] border-white flex items-center justify-center ${
                user.is_online ? 'bg-emerald-500' : 'bg-gray-400'
              }`}
              title={user.is_online ? 'Online' : 'Offline'}
            >
              <div className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-white animate-pulse' : 'bg-gray-200'}`}></div>
            </div>
          </div>

          {/* Identity */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-black text-gray-900 font-display tracking-tight leading-tight">
                {user.nama_lengkap}
              </h2>
              {isAdmin && (
                <ShieldCheck className="w-5 h-5 text-amber-600 inline" title="Official EMKAIN Administrator" />
              )}
            </div>
            <p className="text-xs font-bold text-gray-500">
              @{user.username || 'user'}
            </p>
            <div className="pt-1 flex items-center justify-center gap-2">
              <span className={`px-3 py-0.5 rounded-full neo-border-thin text-[10px] font-black uppercase tracking-wider ${
                isAdmin ? 'bg-[#FFD166] text-gray-900' : 'bg-[#B4D3FF] text-gray-900'
              }`}>
                {isAdmin ? 'ADMINISTRATOR' : 'GURU'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                user.is_online ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                <span>{user.is_online ? 'ONLINE' : 'OFFLINE'}</span>
              </span>
            </div>
          </div>

          {/* Details Table Card */}
          <div className="bg-white rounded-2xl neo-border-thin p-4 text-left space-y-2.5 shadow-xs text-xs">
            {user.sekolah && (
              <div className="flex items-start gap-2.5 text-gray-700">
                <School className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase block">Sekolah / Instansi</span>
                  <span className="font-bold">{user.sekolah}</span>
                </div>
              </div>
            )}

            {user.mata_pelajaran && (
              <div className="flex items-start gap-2.5 text-gray-700">
                <BookOpen className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase block">Mata Pelajaran</span>
                  <span className="font-bold">{user.mata_pelajaran} {user.kelas ? `(Kelas ${user.kelas})` : ''}</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 text-gray-700">
              <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase block">Aktivitas</span>
                <span className="font-bold text-gray-700">
                  {formatLastSeen(user.last_seen_at, user.is_online)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase block">Status Akun</span>
                <span className="font-bold text-emerald-700 uppercase tracking-wide">
                  {user.status === 'aktif' ? 'AKUN AKTIF' : 'NONAKTIF'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!isSelf ? (
            <button
              onClick={() => {
                onClose();
                onStartChat(user);
              }}
              className="w-full py-3.5 bg-[#FF8B7B] hover:bg-[#ff9f8f] text-gray-900 neo-border rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer neo-shadow-sm transition-all"
              id="modal-send-message-btn"
            >
              <MessageSquare className="w-4 h-4" />
              <span>KIRIM PESAN PRIBADI</span>
            </button>
          ) : (
            <div className="py-2 text-[11px] font-bold text-gray-500 bg-gray-100 rounded-xl neo-border-thin">
              Ini adalah profil Anda sendiri
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
