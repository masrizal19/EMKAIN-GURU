import React, { useState } from 'react';
import { ChatMessage, UserProfile } from '../../types';
import { formatFileSize, getFileCategoryInfo } from './chatUtils';
import {
  Download,
  ExternalLink,
  Eye,
  Trash2,
  Globe,
  Volume2,
  Video as VideoIcon,
  Check,
  CheckCheck,
  Ban,
  AlertCircle
} from 'lucide-react';

interface ChatMessageItemProps {
  msg: ChatMessage;
  currentUserId: string;
  currentUserRole?: 'admin' | 'guru';
  recipientId?: string;
  onOpenImageModal: (url: string, name?: string) => void;
  onDeleteMessage?: (msgId: string) => void;
}

// Convert plaintext URLs into clickable links safely
function renderMessageText(text: string) {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline font-bold hover:text-blue-800 break-all inline-flex items-center gap-0.5 mx-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
          <ExternalLink className="w-2.5 h-2.5 inline" />
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  msg,
  currentUserId,
  currentUserRole,
  recipientId,
  onOpenImageModal,
  onDeleteMessage
}) => {
  const isSelf = msg.sender_id === currentUserId;
  const canDelete = isSelf || currentUserRole === 'admin';
  const isRetracted = msg.message_type === 'retracted' || msg.is_deleted === true;
  const [showConfirmRetract, setShowConfirmRetract] = useState(false);

  const hasAttachments = !isRetracted && Array.isArray(msg.attachments) && msg.attachments.length > 0;
  const hasLink = !isRetracted && !!msg.link_url;

  // Read receipt status computation
  // If recipientId is known, check if recipientId is in read_by array.
  // Otherwise if read_by has more than 1 user (sender + at least 1 other), it is read.
  const isReadByRecipient = !!(
    msg.read_by && (
      (recipientId && msg.read_by.includes(recipientId)) ||
      msg.read_by.some(id => id !== msg.sender_id)
    )
  );

  return (
    <div
      className={`group relative flex gap-2.5 max-w-[88%] md:max-w-[72%] ${
        isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'
      }`}
      id={`message-item-${msg.id}`}
    >
      {/* Avatar for recipient */}
      {!isSelf && (
        <div className="w-7 h-7 rounded-full bg-[#B4D3FF] neo-border-thin flex items-center justify-center text-xs flex-shrink-0 mt-1">
          {msg.sender_profile?.avatar_url || '👩‍🏫'}
        </div>
      )}

      {/* Message Bubble Container */}
      <div className="space-y-1 flex-1 min-w-0">
        <div
          className={`p-3.5 rounded-2xl neo-border-thin space-y-2.5 transition-all ${
            isRetracted
              ? 'bg-gray-100 text-gray-500 border-gray-300 italic opacity-85'
              : isSelf
                ? 'bg-[#FFD166] text-gray-900 rounded-br-xs'
                : 'bg-white text-gray-900 rounded-bl-xs neo-shadow-xs'
          }`}
        >
          {/* Sender Header for Received Messages */}
          {!isSelf && !isRetracted && (
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-1 text-[11px] font-black text-gray-800">
              <span className="truncate">{msg.sender_profile?.nama_lengkap || 'Rekan Guru'}</span>
              <span className="text-[9px] font-bold text-gray-400 capitalize">
                {msg.sender_profile?.role || 'guru'}
              </span>
            </div>
          )}

          {/* RETRACTED MESSAGE STATE */}
          {isRetracted ? (
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 py-0.5">
              <Ban className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span>Pesan ini telah ditarik</span>
            </div>
          ) : (
            <>
              {/* 1. ATTACHMENTS RENDERING */}
              {hasAttachments && (
                <div className="space-y-2">
                  {msg.attachments!.map((att) => {
                    const cat = att.file_category;
                    const catInfo = getFileCategoryInfo(cat, att.name);
                    const downloadUrl = att.download_url || att.url;

                    // --- A. IMAGE ATTACHMENT ---
                    if (cat === 'image' || att.mime_type.startsWith('image/')) {
                      return (
                        <div key={att.id} className="space-y-1.5">
                          <div
                            className="relative rounded-xl overflow-hidden neo-border-thin bg-black/5 cursor-pointer max-h-72 group/img"
                            onClick={() => onOpenImageModal(att.url, att.name)}
                          >
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-full h-auto max-h-72 object-cover transition-transform duration-200 group-hover/img:scale-102"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <span className="p-2 bg-white/90 neo-border-thin rounded-xl text-gray-900 text-xs font-black flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> Lihat Foto
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 px-0.5">
                            <span className="truncate max-w-[180px]">{att.name}</span>
                            <span className="text-gray-500 flex-shrink-0">{formatFileSize(att.size)}</span>
                          </div>
                        </div>
                      );
                    }

                    // --- B. VIDEO ATTACHMENT ---
                    if (cat === 'video' || att.mime_type.startsWith('video/')) {
                      return (
                        <div key={att.id} className="space-y-1.5">
                          <div className="rounded-xl overflow-hidden neo-border-thin bg-black">
                            <video
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full max-h-64 rounded-xl"
                              src={att.url}
                            >
                              Browser Anda tidak mendukung pemutaran video.
                            </video>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 px-0.5">
                            <span className="truncate max-w-[180px] flex items-center gap-1">
                              <VideoIcon className="w-3 h-3 text-red-500" /> {att.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">{formatFileSize(att.size)}</span>
                              <a
                                href={downloadUrl}
                                download={att.name}
                                className="text-blue-600 hover:underline flex items-center gap-0.5"
                                title="Unduh Video"
                              >
                                <Download className="w-2.5 h-2.5" /> Unduh
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // --- C. AUDIO ATTACHMENT ---
                    if (cat === 'audio' || att.mime_type.startsWith('audio/')) {
                      return (
                        <div key={att.id} className="p-3 bg-white neo-border-thin rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-xs font-black text-gray-900">
                            <Volume2 className="w-4 h-4 text-teal-600" />
                            <span className="truncate">{att.name}</span>
                          </div>
                          <audio controls className="w-full h-8" src={att.url}>
                            Browser Anda tidak mendukung audio.
                          </audio>
                          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                            <span>{formatFileSize(att.size)}</span>
                            <a
                              href={downloadUrl}
                              download={att.name}
                              className="text-teal-600 hover:underline font-black flex items-center gap-1 text-[10px]"
                            >
                              <Download className="w-3 h-3" /> Unduh
                            </a>
                          </div>
                        </div>
                      );
                    }

                    // --- D. DOCUMENTS (PDF, Word, PPT, Excel, CSV, etc.) ---
                    return (
                      <div
                        key={att.id}
                        className="p-3 bg-white/95 hover:bg-white neo-border-thin rounded-xl flex items-center justify-between gap-3 shadow-2xs transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-xl ${catInfo.bgColor} ${catInfo.textColor} neo-border-thin flex flex-col items-center justify-center font-black text-xs flex-shrink-0`}>
                            <span className="text-sm">{catInfo.iconEmoji}</span>
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-black text-gray-900 truncate" title={att.name}>
                              {att.name}
                            </h5>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 mt-0.5">
                              <span className={`px-1.5 py-0.2 rounded font-black text-[9px] uppercase ${catInfo.bgColor} text-white`}>
                                {catInfo.label}
                              </span>
                              <span>{formatFileSize(att.size)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
                            title="Buka Pratinjau di Tab Baru"
                          >
                            <Eye className="w-3 h-3" />
                            <span className="hidden sm:inline">Buka</span>
                          </a>
                          <a
                            href={downloadUrl}
                            download={att.name}
                            className="p-1.5 px-2.5 bg-[#FF8B7B] hover:bg-[#ff9f8f] text-gray-900 neo-border-thin rounded-lg text-[10px] font-black flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Download Berkas"
                          >
                            <Download className="w-3 h-3" />
                            <span>Unduh</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. LINK PREVIEW CARD */}
              {hasLink && (
                <a
                  href={msg.link_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-white/95 hover:bg-white neo-border-thin rounded-xl space-y-1 shadow-2xs group/link transition-all"
                >
                  <div className="flex items-center justify-between text-[10px] font-black text-blue-600">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {msg.link_title || 'Tautan Web'}
                    </span>
                    <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                  </div>

                  <p className="text-xs font-black text-gray-900 truncate">
                    {msg.link_title || msg.link_url}
                  </p>

                  {msg.link_description && (
                    <p className="text-[11px] text-gray-600 line-clamp-2">
                      {msg.link_description}
                    </p>
                  )}

                  <p className="text-[10px] text-gray-400 font-mono truncate pt-0.5">
                    {msg.link_url}
                  </p>
                </a>
              )}

              {/* 3. TEXT MESSAGE CONTENT */}
              {msg.message && msg.message.trim() && (
                <p className="text-xs font-medium leading-relaxed whitespace-pre-line break-words">
                  {renderMessageText(msg.message)}
                </p>
              )}
            </>
          )}

          {/* Timestamp & Status Checkmarks */}
          <div
            className={`text-[9px] font-bold flex items-center justify-end gap-1.5 ${
              isSelf ? 'text-gray-700' : 'text-gray-400'
            }`}
          >
            <span>
              {new Date(msg.created_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>

            {/* Read Receipt Status for Sent Messages */}
            {isSelf && !isRetracted && (
              <span className="flex items-center ml-0.5" title={isReadByRecipient ? 'Telah dibaca' : 'Terkirim'}>
                {isReadByRecipient ? (
                  // ✓✓ Biru (Read)
                  <CheckCheck className="w-3.5 h-3.5 text-blue-600 inline font-extrabold stroke-[2.5]" />
                ) : (
                  // ✓✓ Abu-abu / ✓ (Delivered)
                  <CheckCheck className="w-3.5 h-3.5 text-gray-500 inline stroke-[2]" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Action Button: Retract message (Sender or Admin) */}
        {canDelete && !isRetracted && onDeleteMessage && (
          <div className="flex items-center justify-end gap-1 px-1">
            {showConfirmRetract ? (
              <div className="flex items-center gap-1.5 bg-white p-1 px-2.5 rounded-xl neo-border-thin text-[10px] font-bold shadow-sm animate-fadeIn">
                <span className="text-gray-700 font-black">Tarik pesan ini?</span>
                <button
                  onClick={() => {
                    onDeleteMessage(msg.id);
                    setShowConfirmRetract(false);
                  }}
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black cursor-pointer shadow-xs transition-colors"
                >
                  TARIK PESAN
                </button>
                <button
                  onClick={() => setShowConfirmRetract(false)}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  BATAL
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmRetract(true)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                title="Tarik kembali pesan ini"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Tarik Pesan</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageItem;
