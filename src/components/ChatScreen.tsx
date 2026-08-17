/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Conversation, ChatMessage, ChatAttachment } from '../types';
import UserProfileModal from './UserProfileModal';
import ChatMessageItem from './chat/ChatMessageItem';
import ChatAttachmentMenu from './chat/ChatAttachmentMenu';
import ChatPendingAttachments, { PendingFileItem, PendingLinkItem } from './chat/ChatPendingAttachments';
import ChatLinkModal from './chat/ChatLinkModal';
import ChatImageModal from './chat/ChatImageModal';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Search,
  Users,
  ShieldCheck,
  Plus,
  Paperclip,
  X,
  UploadCloud,
  AlertCircle
} from 'lucide-react';

interface ChatScreenProps {
  profile: UserProfile;
  onBack: () => void;
  initialTargetUser?: UserProfile | null;
}

export default function ChatScreen({
  profile,
  onBack,
  initialTargetUser
}: ChatScreenProps) {
  // Main State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Attachment & Composer State
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);
  const [pendingLink, setPendingLink] = useState<PendingLinkItem | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Modals
  const [activeLightboxImage, setActiveLightboxImage] = useState<{ url: string; name?: string } | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [allMembers, setAllMembers] = useState<UserProfile[]>([]);
  const [loadingAllMembers, setLoadingAllMembers] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [profileModalUser, setProfileModalUser] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper for auth token with safe fallback
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  };

  // Categorize file client-side for immediate preview
  const categorizeClientFile = (file: File): 'doc' | 'pdf' | 'ppt' | 'excel' | 'image' | 'video' | 'audio' | 'other' => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mime = file.type.toLowerCase();

    if (ext === 'pdf' || mime.includes('pdf')) return 'pdf';
    if (['doc', 'docx'].includes(ext) || mime.includes('word')) return 'doc';
    if (['ppt', 'pptx'].includes(ext) || mime.includes('powerpoint') || mime.includes('presentation')) return 'ppt';
    if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet') || mime === 'text/csv') return 'excel';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || mime.startsWith('image/')) return 'image';
    if (['mp4', 'webm', 'mov'].includes(ext) || mime.startsWith('video/')) return 'video';
    if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext) || mime.startsWith('audio/')) return 'audio';
    return 'other';
  };

  // Add files to pending queue with validation
  const handleAddFiles = (files: FileList | File[]) => {
    setErrorMessage(null);
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    const newItems: PendingFileItem[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > MAX_SIZE) {
        setErrorMessage(`File "${file.name}" melebihi batas 50 MB.`);
        return;
      }

      const cat = categorizeClientFile(file);
      let previewUrl: string | undefined;

      if (cat === 'image') {
        previewUrl = URL.createObjectURL(file);
      }

      newItems.push({
        file,
        previewUrl,
        category: cat
      });
    });

    if (newItems.length > 0) {
      setPendingFiles((prev) => [...prev, ...newItems]);
    }
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Fetch all conversations
  const fetchConversations = async (silent: boolean = false) => {
    if (!silent && isMountedRef.current) setLoadingConvs(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        if (!silent && isMountedRef.current) setLoadingConvs(false);
        return;
      }

      const res = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (isMountedRef.current && data.success && Array.isArray(data.conversations)) {
          setConversations(data.conversations);

          // Update selected conversation with fresh other_user presence
          if (selectedConversation) {
            const updated = data.conversations.find((c: Conversation) => c.id === selectedConversation.id);
            if (updated && isMountedRef.current) {
              setSelectedConversation(updated);
            }
          }
        }
      }
    } catch {
      // Gracefully handle temporary network disconnects or polling glitches
    } finally {
      if (!silent && isMountedRef.current) setLoadingConvs(false);
    }
  };

  // Fetch messages for active conversation
  const fetchMessages = async (convId: string, silent: boolean = false) => {
    if (!silent && isMountedRef.current) setLoadingMsgs(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        if (!silent && isMountedRef.current) setLoadingMsgs(false);
        return;
      }

      const res = await fetch(`/api/chat/conversations/${convId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (isMountedRef.current && data.success && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch {
      // Gracefully handle network errors during message polling
    } finally {
      if (!silent && isMountedRef.current) setLoadingMsgs(false);
    }
  };

  // Start or open direct conversation with a target user
  const startDirectConversationWithUser = async (targetUser: UserProfile) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch('/api/chat/conversations/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: targetUser.id })
      });

      if (res.ok) {
        const data = await res.json();
        if (isMountedRef.current && data.success && data.conversation) {
          setSelectedConversation(data.conversation);
          setIsNewChatModalOpen(false);
          fetchMessages(data.conversation.id);
          fetchConversations(true);
        }
      }
    } catch {
      // Gracefully catch
    }
  };

  // Load all members for new chat selector
  const fetchAllMembersForNewChat = async () => {
    if (isMountedRef.current) setLoadingAllMembers(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        if (isMountedRef.current) setLoadingAllMembers(false);
        return;
      }

      const res = await fetch('/api/community/members', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (isMountedRef.current && data.success && Array.isArray(data.members)) {
          setAllMembers(data.members.filter((m: UserProfile) => m.id !== profile.id));
        }
      }
    } catch {
      // Gracefully catch
    } finally {
      if (isMountedRef.current) setLoadingAllMembers(false);
    }
  };

  // Initial mount & if initialTargetUser was provided
  useEffect(() => {
    fetchConversations();

    if (initialTargetUser && initialTargetUser.id !== profile.id) {
      startDirectConversationWithUser(initialTargetUser);
    }

    const interval = setInterval(() => {
      fetchConversations(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Sync messages when selected conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      const msgInterval = setInterval(() => {
        fetchMessages(selectedConversation.id, true);
      }, 3000);
      return () => clearInterval(msgInterval);
    }
  }, [selectedConversation?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message (Handles Text, Files Upload, and Link)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConversation) return;

    const messageText = inputText.trim();
    const hasFiles = pendingFiles.length > 0;
    const hasLink = !!pendingLink;

    if (!messageText && !hasFiles && !hasLink) return;

    setSendingMsg(true);
    setErrorMessage(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setErrorMessage('Sesi telah berakhir. Silakan muat ulang halaman.');
        return;
      }

      let uploadedAttachments: ChatAttachment[] = [];

      // 1. Upload files first if any
      if (hasFiles) {
        const formData = new FormData();
        formData.append('conversationId', selectedConversation.id);
        pendingFiles.forEach((p) => {
          formData.append('files', p.file);
        });

        const uploadRes = await fetch('/api/chat/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.message || 'Gagal mengunggah file.');
        }

        const uploadData = await uploadRes.json();
        if (uploadData.success && Array.isArray(uploadData.attachments)) {
          uploadedAttachments = uploadData.attachments;
        }
      }

      // 2. Determine final message type
      let finalType: 'text' | 'file' | 'image' | 'video' | 'audio' | 'link' = 'text';
      if (uploadedAttachments.length > 0) {
        const firstCat = uploadedAttachments[0].file_category;
        if (firstCat === 'image') finalType = 'image';
        else if (firstCat === 'video') finalType = 'video';
        else if (firstCat === 'audio') finalType = 'audio';
        else finalType = 'file';
      } else if (hasLink) {
        finalType = 'link';
      }

      // 3. Post Message
      const messagePayload = {
        message: messageText,
        message_type: finalType,
        attachments: uploadedAttachments,
        link_url: pendingLink?.url,
        link_title: pendingLink?.title,
        link_description: pendingLink?.description
      };

      const res = await fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(messagePayload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          setMessages((prev) => [...prev, data.message]);
          // Reset composer
          setInputText('');
          setPendingFiles([]);
          setPendingLink(null);
          setIsAttachmentMenuOpen(false);
          fetchConversations(true);
        }
      } else {
        const errData = await res.json();
        setErrorMessage(errData.message || 'Gagal mengirim pesan.');
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setErrorMessage(err.message || 'Gagal mengirim pesan. Silakan coba lagi.');
    } finally {
      setSendingMsg(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(`/api/chat/messages/${msgId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        fetchConversations(true);
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const other = c.other_user;
      if (!other) return false;
      const q = searchQuery.toLowerCase();
      return (
        other.nama_lengkap.toLowerCase().includes(q) ||
        other.username.toLowerCase().includes(q) ||
        (c.last_message?.message || '').toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery]);

  // Filter members in new chat modal
  const filteredNewChatMembers = useMemo(() => {
    return allMembers.filter((m) => {
      const q = newChatSearch.toLowerCase();
      return (
        m.nama_lengkap.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.sekolah && m.sekolah.toLowerCase().includes(q)) ||
        (m.mata_pelajaran && m.mata_pelajaran.toLowerCase().includes(q))
      );
    });
  }, [allMembers, newChatSearch]);

  const formatPresence = (isOnline?: boolean, lastSeen?: string | null) => {
    if (isOnline) return '● ONLINE';
    if (!lastSeen) return '○ OFFLINE';
    try {
      const diffMs = Date.now() - new Date(lastSeen).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return '○ OFFLINE • Baru saja';
      if (diffMin < 60) return `○ OFFLINE • ${diffMin}m lalu`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `○ OFFLINE • ${diffHour}j lalu`;
      return `○ OFFLINE • ${new Date(lastSeen).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
    } catch (e) {
      return '○ OFFLINE';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4" id="chat-lounge-container">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-white neo-border-thin rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 transition-all"
            id="chat-back-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK</span>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 font-display flex items-center gap-2">
              EMKAIN LOUNGE <MessageSquare className="w-5 h-5 text-[#FF8B7B]" />
            </h1>
            <p className="text-xs text-gray-500 font-bold hidden sm:block">
              Ruang komunikasi langsung dan pesan pribadi antar rekan guru EMKAIN.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsNewChatModalOpen(true);
            fetchAllMembersForNewChat();
          }}
          className="px-4 py-2 bg-[#FF8B7B] hover:bg-[#ff9f8f] text-gray-900 neo-border rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer neo-shadow-sm transition-all"
          id="new-chat-btn"
        >
          <Plus className="w-4 h-4" />
          <span>PESAN BARU</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[550px]">
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: CONVERSATIONS LIST (4 cols on md) */}
        {/* ========================================================================= */}
        <div className={`md:col-span-4 bg-white rounded-2xl neo-border neo-shadow flex flex-col overflow-hidden ${
          selectedConversation ? 'hidden md:flex' : 'flex'
        }`} id="chat-conversations-panel">
          
          {/* Panel Header & Search */}
          <div className="p-4 border-b border-gray-100 space-y-3 bg-[#FAF6F0]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-gray-900 font-display flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-700" />
                <span>Pesan & Kontak ({conversations.length})</span>
              </h3>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari percakapan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-white neo-border-thin rounded-xl text-xs font-bold focus:outline-none focus:border-[#FF8B7B]"
              />
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5" id="conversations-scroll-list">
            {loadingConvs ? (
              <div className="p-8 text-center text-xs font-bold text-gray-400">
                Memuat percakapan...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="text-3xl">💬</div>
                <p className="text-xs font-bold text-gray-600">Belum ada percakapan</p>
                <p className="text-[11px] text-gray-400 font-medium">
                  Klik tombol "+ PESAN BARU" untuk memulai diskusi dengan rekan guru.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = conv.other_user;
                if (!other) return null;
                const isSelected = selectedConversation?.id === conv.id;
                const isOtherAdmin = other.role === 'admin' || other.username === 'admin';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-3 rounded-xl neo-border-thin cursor-pointer transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-[#FF8B7B] text-gray-900 neo-shadow-sm font-bold'
                        : 'bg-white hover:bg-gray-50 text-gray-800'
                    }`}
                    id={`conversation-item-${conv.id}`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#B4D3FF] neo-border-thin flex items-center justify-center text-xl">
                        {other.avatar_url || (isOtherAdmin ? '🛡️' : '👩‍🏫')}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          other.is_online ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-black truncate">
                          {other.nama_lengkap}
                        </h4>
                        {conv.last_message && (
                          <span className="text-[9px] text-gray-500 font-bold flex-shrink-0">
                            {new Date(conv.last_message.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className={`text-[11px] truncate ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                          {conv.last_message?.message || 'Mulai percakapan...'}
                        </p>

                        {conv.unread_count > 0 && (
                          <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[9px] font-black flex-shrink-0 animate-bounce">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: ACTIVE CONVERSATION MESSAGES & ENHANCED COMPOSER (8 cols) */}
        {/* ========================================================================= */}
        <div
          className={`md:col-span-8 bg-white rounded-2xl neo-border neo-shadow flex flex-col overflow-hidden relative ${
            !selectedConversation ? 'hidden md:flex' : 'flex'
          }`}
          id="chat-active-window"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedConversation ? (
            <>
              {/* Drag and Drop Overlay */}
              {isDragging && (
                <div className="absolute inset-0 z-30 bg-[#FF8B7B]/20 backdrop-blur-xs border-4 border-dashed border-[#FF8B7B] rounded-2xl flex flex-col items-center justify-center pointer-events-none animate-fadeIn">
                  <div className="p-6 bg-white rounded-3xl neo-border neo-shadow-lg text-center space-y-2">
                    <UploadCloud className="w-10 h-10 text-[#FF8B7B] mx-auto animate-bounce" />
                    <h4 className="text-sm font-black text-gray-900 uppercase font-display">
                      Lepaskan Berkas di Sini
                    </h4>
                    <p className="text-xs text-gray-500 font-bold">
                      Dokumen, gambar, video, dan audio akan dilampirkan ke pesan.
                    </p>
                  </div>
                </div>
              )}

              {/* Active Conversation Top Bar */}
              <div className="p-3.5 px-4 bg-[#FAF6F0] border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-1.5 bg-white neo-border-thin rounded-lg text-gray-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* Other User Info */}
                  <div
                    className="flex items-center gap-2.5 cursor-pointer group"
                    onClick={() => {
                      if (selectedConversation.other_user) {
                        setProfileModalUser(selectedConversation.other_user);
                        setIsProfileModalOpen(true);
                      }
                    }}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-[#FFD166] neo-border-thin flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                        {selectedConversation.other_user?.avatar_url || '👩‍🏫'}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          selectedConversation.other_user?.is_online ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-black text-xs md:text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                          {selectedConversation.other_user?.nama_lengkap || 'Rekan Guru'}
                        </h3>
                        {selectedConversation.other_user?.role === 'admin' && (
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 inline" />
                        )}
                      </div>
                      <p className="text-[10px] font-extrabold text-gray-500">
                        {formatPresence(
                          selectedConversation.other_user?.is_online,
                          selectedConversation.other_user?.last_seen_at
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (selectedConversation.other_user) {
                      setProfileModalUser(selectedConversation.other_user);
                      setIsProfileModalOpen(true);
                    }
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 neo-border-thin rounded-xl text-[10px] font-black text-gray-800 cursor-pointer shadow-xs"
                >
                  Lihat Profil
                </button>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FCFBF8]" id="messages-stream-list">
                {loadingMsgs ? (
                  <div className="py-12 text-center text-xs font-bold text-gray-400">
                    Memuat riwayat percakapan...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="text-3xl">👋</div>
                    <p className="text-xs font-black text-gray-700">Mulai Percakapan Pribadi</p>
                    <p className="text-[11px] font-medium text-gray-500 max-w-sm mx-auto">
                      Kirim pesan, dokumen materi, gambar, audio, atau tautan pertama Anda kepada {selectedConversation.other_user?.nama_lengkap}.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <ChatMessageItem
                      key={msg.id}
                      msg={msg}
                      currentUserId={profile.id}
                      onOpenImageModal={(url, name) => setActiveLightboxImage({ url, name })}
                      onDeleteMessage={handleDeleteMessage}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error Toast Notification if any */}
              {errorMessage && (
                <div className="px-4 py-2 bg-rose-100 border-t border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button onClick={() => setErrorMessage(null)} className="p-0.5 hover:bg-rose-200 rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Pending Attachments Bar (Preview before sending) */}
              <ChatPendingAttachments
                files={pendingFiles}
                link={pendingLink}
                onRemoveFile={handleRemovePendingFile}
                onRemoveLink={() => setPendingLink(null)}
                isUploading={sendingMsg}
              />

              {/* Enhanced Message Composer Bar */}
              <div className="p-3 bg-[#FAF6F0] border-t border-gray-200 relative">
                {/* Popover Attachment Menu */}
                <ChatAttachmentMenu
                  isOpen={isAttachmentMenuOpen}
                  onClose={() => setIsAttachmentMenuOpen(false)}
                  onSelectFiles={handleAddFiles}
                  onOpenLinkModal={() => setIsLinkModalOpen(true)}
                />

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {/* Attachment Button 📎 */}
                  <button
                    type="button"
                    onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                    className={`p-2.5 rounded-xl neo-border-thin flex items-center justify-center transition-all cursor-pointer ${
                      isAttachmentMenuOpen || pendingFiles.length > 0 || pendingLink
                        ? 'bg-[#FF8B7B] text-gray-900 shadow-xs'
                        : 'bg-white hover:bg-gray-100 text-gray-700'
                    }`}
                    title="Lampirkan Dokumen, Gambar, Video, Audio, atau Link"
                    id="attachment-menu-btn"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Input Field */}
                  <input
                    type="text"
                    placeholder={
                      pendingFiles.length > 0 || pendingLink
                        ? 'Tambahkan keterangan pesan (opsional)...'
                        : `Tulis pesan untuk ${selectedConversation.other_user?.nama_lengkap || 'guru'}...`
                    }
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white neo-border-thin rounded-xl text-xs font-bold focus:outline-none focus:border-[#FF8B7B]"
                    id="chat-message-input"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={sendingMsg || (!inputText.trim() && pendingFiles.length === 0 && !pendingLink)}
                    className="px-5 py-2.5 bg-[#FF8B7B] hover:bg-[#ff9f8f] text-gray-900 neo-border rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-all"
                    id="send-chat-message-btn"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {sendingMsg ? 'MENGIRIM...' : 'KIRIM'}
                    </span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#FCFBF8]">
              <div className="w-16 h-16 rounded-full bg-[#FAF6F0] neo-border flex items-center justify-center text-3xl shadow-sm">
                💬
              </div>
              <h3 className="text-base font-black text-gray-900 font-display">
                Pilih Percakapan atau Mulai Pesan Baru
              </h3>
              <p className="text-xs text-gray-500 font-medium max-w-sm">
                Pilih kontak dari daftar di sebelah kiri atau klik tombol "PESAN BARU" untuk menghubungi rekan guru atau admin EMKAIN.
              </p>
              <button
                onClick={() => {
                  setIsNewChatModalOpen(true);
                  fetchAllMembersForNewChat();
                }}
                className="px-4 py-2.5 bg-[#FF8B7B] text-gray-900 neo-border rounded-xl font-black text-xs uppercase flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>MULAI PESAN BARU</span>
              </button>
            </div>
          )}

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: PESAN BARU (DIRECT CHAT PICKER) */}
      {/* ========================================================================= */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[#FAF6F0] rounded-3xl neo-border neo-shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="text-sm font-black uppercase text-gray-900 font-display flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF8B7B]" />
                <span>Mulai Pesan Baru</span>
              </h3>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama guru atau mata pelajaran..."
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2.5 bg-white neo-border-thin rounded-xl text-xs font-bold focus:outline-none focus:border-[#FF8B7B]"
              />
            </div>

            {/* Members List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {loadingAllMembers ? (
                <div className="py-8 text-center text-xs font-bold text-gray-400">
                  Memuat daftar anggota...
                </div>
              ) : filteredNewChatMembers.length === 0 ? (
                <div className="py-8 text-center text-xs font-bold text-gray-400">
                  Tidak ada guru yang cocok dengan pencarian
                </div>
              ) : (
                filteredNewChatMembers.map((member) => {
                  const isMemberAdmin = member.role === 'admin' || member.email?.toLowerCase().trim() === 'admin@gmail.com';

                  return (
                    <div
                      key={member.id}
                      onClick={() => startDirectConversationWithUser(member)}
                      className="p-3 bg-white hover:bg-amber-50 rounded-xl neo-border-thin flex items-center justify-between cursor-pointer transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-[#FFD166] neo-border-thin flex items-center justify-center text-lg">
                            {member.avatar_url || (isMemberAdmin ? '🛡️' : '👩‍🏫')}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              member.is_online ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-xs text-gray-900">
                              {member.nama_lengkap}
                            </h4>
                            {isMemberAdmin && (
                              <ShieldCheck className="w-3 h-3 text-amber-600 inline" />
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 font-bold">
                            @{member.username} {member.mata_pelajaran ? `• ${member.mata_pelajaran}` : ''}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full neo-border-thin text-[8px] font-black uppercase ${
                          isMemberAdmin ? 'bg-[#FFD166] text-gray-900' : 'bg-[#B4D3FF] text-gray-900'
                        }`}
                      >
                        {isMemberAdmin ? 'ADMIN' : 'GURU'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Insert Link Modal */}
      <ChatLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onInsertLink={(linkData) => setPendingLink(linkData)}
      />

      {/* Lightbox Image Preview Modal */}
      <ChatImageModal
        imageUrl={activeLightboxImage?.url || null}
        imageName={activeLightboxImage?.name}
        onClose={() => setActiveLightboxImage(null)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        user={profileModalUser}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onStartChat={(targetUser) => {
          setIsProfileModalOpen(false);
          startDirectConversationWithUser(targetUser);
        }}
        currentUserId={profile.id}
      />
    </div>
  );
}
