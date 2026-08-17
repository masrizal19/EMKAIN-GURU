/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, ForumPost, ForumComment } from '../types';
import { getApiUrl } from '../lib/api';
import UserProfileModal from './UserProfileModal';
import {
  MessageSquare,
  Heart,
  Sparkles,
  Send,
  ArrowLeft,
  Search,
  Users,
  ShieldCheck,
  Globe,
  Lock,
  MessageCircle,
  RefreshCw,
  Clock
} from 'lucide-react';

interface CommunityScreenProps {
  profile: UserProfile;
  onBack: () => void;
  onStartChatWithUser?: (user: UserProfile) => void;
}

export default function CommunityScreen({
  profile,
  onBack,
  onStartChatWithUser
}: CommunityScreenProps) {
  // Post Creator State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [submitting, setSubmitting] = useState(false);
  const [postErrorMsg, setPostErrorMsg] = useState('');

  // Feed State
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [postCommentsMap, setPostCommentsMap] = useState<Record<string, ForumComment[]>>({});
  const [loadingCommentsMap, setLoadingCommentsMap] = useState<Record<string, boolean>>({});
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});
  const [submittingCommentMap, setSubmittingCommentMap] = useState<Record<string, boolean>>({});

  // Members Directory State
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [searchMember, setSearchMember] = useState('');
  const [memberFilter, setMemberFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE' | 'ADMIN' | 'GURU'>('ALL');

  // Profile Modal State
  const [selectedUserForModal, setSelectedUserForModal] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Auth token helper
  const getAuthToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Fetch Forum Posts from Server API
  const fetchPosts = async (silent: boolean = false) => {
    if (!silent) setLoadingPosts(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setLoadingPosts(false);
        return;
      }

      const res = await fetch(getApiUrl('/api/community/posts'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.posts)) {
          setPosts(data.posts);
        }
      }
    } catch (err) {
      console.error('Error fetching forum posts:', err);
    } finally {
      if (!silent) setLoadingPosts(false);
    }
  };

  // Fetch Community Members from Server API
  const fetchMembers = async (silent: boolean = false) => {
    if (!silent) setLoadingMembers(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setLoadingMembers(false);
        return;
      }

      const res = await fetch(getApiUrl('/api/community/members'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.members)) {
          setMembers(data.members);
        }
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      if (!silent) setLoadingMembers(false);
    }
  };

  // Initial Load + Auto Refresh loop (every 10 seconds for real-time presence & discussions)
  useEffect(() => {
    fetchPosts();
    fetchMembers();

    const interval = setInterval(() => {
      fetchPosts(true);
      fetchMembers(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Handle Post Creation
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setPostErrorMsg('');

    try {
      const token = await getAuthToken();
      if (!token) {
        setPostErrorMsg('Sesi login telah berakhir.');
        setSubmitting(false);
        return;
      }

      const res = await fetch(getApiUrl('/api/community/posts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          visibility
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setTitle('');
        setContent('');
        // Add new post to top of feed
        if (result.post) {
          setPosts((prev) => [result.post, ...prev]);
        } else {
          fetchPosts(true);
        }
      } else {
        setPostErrorMsg(result.message || 'Gagal mengirim postingan.');
      }
    } catch (err) {
      setPostErrorMsg('Terjadi kesalahan koneksi ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Post Like Toggle
  const handleToggleLike = async (postId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const hasLiked = !!p.user_has_liked;
            return {
              ...p,
              user_has_liked: !hasLiked,
              likes_count: hasLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1
            };
          }
          return p;
        })
      );

      const res = await fetch(getApiUrl(`/api/community/posts/${postId}/like`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? { ...p, user_has_liked: data.user_has_liked, likes_count: data.likes_count }
                : p
            )
          );
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // Toggle Comments view and fetch if needed
  const handleToggleComments = async (postId: string) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }

    setActiveCommentsPostId(postId);

    if (!postCommentsMap[postId]) {
      setLoadingCommentsMap((prev) => ({ ...prev, [postId]: true }));
      try {
        const token = await getAuthToken();
        if (!token) return;

        const res = await fetch(getApiUrl(`/api/community/posts/${postId}/comments`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setPostCommentsMap((prev) => ({ ...prev, [postId]: data.comments }));
          }
        }
      } catch (err) {
        console.error('Error loading comments:', err);
      } finally {
        setLoadingCommentsMap((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  // Handle Add Comment
  const handleAddComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const commentText = commentInputMap[postId]?.trim();
    if (!commentText) return;

    setSubmittingCommentMap((prev) => ({ ...prev, [postId]: true }));

    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(getApiUrl(`/api/community/posts/${postId}/comments`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: commentText })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.comment) {
          setPostCommentsMap((prev) => ({
            ...prev,
            [postId]: [...(prev[postId] || []), data.comment]
          }));
          // Increment comment count on post
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
          );
          // Clear input
          setCommentInputMap((prev) => ({ ...prev, [postId]: '' }));
        }
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmittingCommentMap((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Open Profile Modal for any user
  const handleOpenUserProfile = (user: UserProfile) => {
    setSelectedUserForModal(user);
    setIsProfileModalOpen(true);
  };

  // Start Direct Chat with user
  const handleStartChat = (targetUser: UserProfile) => {
    if (onStartChatWithUser) {
      onStartChatWithUser(targetUser);
    } else {
      window.location.hash = `#/lounge`;
    }
  };

  // Filtered Members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const searchMatch =
        m.nama_lengkap.toLowerCase().includes(searchMember.toLowerCase()) ||
        m.username.toLowerCase().includes(searchMember.toLowerCase()) ||
        (m.sekolah && m.sekolah.toLowerCase().includes(searchMember.toLowerCase())) ||
        (m.mata_pelajaran && m.mata_pelajaran.toLowerCase().includes(searchMember.toLowerCase()));

      if (!searchMatch) return false;

      if (memberFilter === 'ONLINE') return m.is_online;
      if (memberFilter === 'OFFLINE') return !m.is_online;
      if (memberFilter === 'ADMIN') return m.role === 'admin';
      if (memberFilter === 'GURU') return m.role === 'guru';

      return true;
    });
  }, [members, searchMember, memberFilter]);

  const formatLastSeen = (lastSeen?: string | null, isOnline?: boolean) => {
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
    <div className="w-full max-w-7xl mx-auto space-y-6" id="community-main-container">
      {/* Top Bar with Back button and Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={onBack}
              className="px-3 py-1.5 bg-white neo-border-thin rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 transition-all mr-2"
              id="community-back-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>BACK</span>
            </button>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight font-display flex items-center gap-2">
              FORUM COMMUNITY <Sparkles className="w-6 h-6 text-[#FF8B7B]" />
            </h1>
          </div>
          <p className="text-gray-600 font-bold text-xs md:text-sm">
            Ruang kolaborasi inspirasi mengajar, direktori pengajar, dan interaksi sesama guru EMKAIN.
          </p>
        </div>

        <button
          onClick={() => {
            fetchPosts();
            fetchMembers();
          }}
          className="px-3.5 py-2 bg-white neo-border-thin rounded-xl text-xs font-black flex items-center gap-2 hover:bg-gray-50 self-start sm:self-auto cursor-pointer"
          title="Segarkan Data"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
          <span>Refresh</span>
        </button>
      </div>

      {/* 3-COLUMN RESPONSIVE LAYOUT (Left: Creator, Center: Posts Feed, Right: Members Directory) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: BAGIKAN INSPIRASI (4 cols on lg) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 bg-white rounded-2xl neo-border neo-shadow p-5 sticky top-4 space-y-4" id="community-left-panel">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-sm font-black uppercase text-gray-900 font-display flex items-center gap-2">
              <span>Bagikan Inspirasi</span>
            </h3>
            <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
              Posting Baru
            </span>
          </div>

          {postErrorMsg && (
            <div className="p-3 bg-red-50 neo-border-thin rounded-xl text-xs font-bold text-red-700">
              {postErrorMsg}
            </div>
          )}

          <form onSubmit={handleCreatePost} className="space-y-3.5" id="community-post-form">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                Judul Topik
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 bg-[#FAF6F0] neo-border-thin rounded-xl font-bold text-xs focus:outline-none focus:border-[#FF8B7B]"
                placeholder="Contoh: Tips mengajar logika matematika kelas X"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                Pesan / Diskusi
              </label>
              <textarea
                required
                rows={4}
                className="w-full px-3.5 py-2.5 bg-[#FAF6F0] neo-border-thin rounded-xl font-medium text-xs focus:outline-none focus:border-[#FF8B7B]"
                placeholder="Tuliskan pengalaman, ide modul ajar, atau pertanyaan Anda di sini..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                Visibilitas
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`py-2 text-[11px] font-black rounded-xl neo-border-thin cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                    visibility === 'public'
                      ? 'bg-[#C1F2D0] text-gray-900 shadow-xs'
                      : 'bg-[#FAF6F0] text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Publik</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`py-2 text-[11px] font-black rounded-xl neo-border-thin cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                    visibility === 'private'
                      ? 'bg-[#FF8B7B] text-gray-900 shadow-xs'
                      : 'bg-[#FAF6F0] text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Privat</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#FF8B7B] hover:bg-[#ff9f8f] text-gray-900 neo-border rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer neo-shadow-sm transition-all"
              id="submit-post-btn"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'MENGIRIM...' : 'KIRIM POSTINGAN'}</span>
            </button>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* CENTER COLUMN: POSTING FORUM FEED (5 cols on lg) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4" id="community-center-feed">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <h3 className="text-sm font-black uppercase text-gray-900 font-display flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span>Diskusi Forum ({posts.length})</span>
            </h3>
            <span className="text-[10px] font-bold text-gray-500">Urutkan Terbaru</span>
          </div>

          {loadingPosts ? (
            <div className="p-12 text-center bg-white rounded-2xl neo-border neo-shadow">
              <div className="animate-spin text-2xl mb-2">⚙️</div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
                Memuat kiriman komunitas...
              </span>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl neo-border neo-shadow space-y-2">
              <div className="text-3xl">📝</div>
              <p className="text-xs font-black text-gray-700 uppercase">Belum ada diskusi publik</p>
              <p className="text-[11px] font-medium text-gray-500">
                Jadilah guru pertama yang membagikan inspirasi atau modul hari ini!
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const isPostAuthorAdmin =
                post.author_profile?.role === 'admin' ||
                post.author_profile?.username === 'admin' ||
                post.author_id === 'e9ba174f-7713-4b80-b8f5-7595c530558d';

              const isCommentsOpen = activeCommentsPostId === post.id;
              const postComments = postCommentsMap[post.id] || [];
              const isLoadingComments = !!loadingCommentsMap[post.id];

              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl neo-border neo-shadow p-5 space-y-3.5 transition-all"
                  id={`post-card-${post.id}`}
                >
                  {/* Author Header */}
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => {
                        handleOpenUserProfile({
                          id: post.author_id,
                          username: post.author_profile?.username || 'user',
                          nama_lengkap: post.author_profile?.nama_lengkap || 'Guru EMKAIN',
                          avatar_url: post.author_profile?.avatar_url || '👩‍🏫',
                          role: isPostAuthorAdmin ? 'admin' : 'guru',
                          status: 'aktif',
                          sekolah: post.author_profile?.sekolah || 'SMK Multi Karya',
                          mata_pelajaran: post.author_profile?.mata_pelajaran || '',
                          kelas: '',
                          email: null,
                          is_online: post.author_profile?.is_online,
                          last_seen_at: post.author_profile?.last_seen_at
                        });
                      }}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-[#B4D3FF] neo-border-thin flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                          {post.author_profile?.avatar_url || (isPostAuthorAdmin ? '🛡️' : '👩‍🏫')}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                            post.author_profile?.is_online ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-xs text-gray-900 group-hover:text-blue-600 transition-colors">
                            {post.author_profile?.nama_lengkap || 'Guru EMKAIN'}
                          </h4>
                          {isPostAuthorAdmin && (
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 inline" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold">
                          <span>@{post.author_profile?.username || 'guru'}</span>
                          <span>•</span>
                          <span>
                            {new Date(post.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                          {post.visibility === 'private' && (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-black flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> PRIVAT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full neo-border-thin text-[8px] font-black uppercase ${
                        isPostAuthorAdmin ? 'bg-[#FFD166] text-gray-900' : 'bg-[#B4D3FF] text-gray-900'
                      }`}
                    >
                      {isPostAuthorAdmin ? 'ADMIN' : 'GURU'}
                    </span>
                  </div>

                  {/* Post Content */}
                  <div className="space-y-1.5">
                    <h3 className="font-black text-sm md:text-base text-gray-900 font-display leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs text-gray-700 font-medium leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>

                  {/* Interactions Footer: Like & Comment Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-600">
                    <div className="flex items-center gap-4">
                      {/* Like button */}
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer transition-all ${
                          post.user_has_liked
                            ? 'text-red-500 bg-red-50 font-black'
                            : 'hover:text-red-500 hover:bg-gray-50'
                        }`}
                        id={`like-btn-${post.id}`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            post.user_has_liked ? 'fill-red-500 text-red-500' : ''
                          }`}
                        />
                        <span>Suka ({post.likes_count || 0})</span>
                      </button>

                      {/* Comment toggle button */}
                      <button
                        onClick={() => handleToggleComments(post.id)}
                        className={`flex items-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer transition-all ${
                          isCommentsOpen
                            ? 'text-blue-600 bg-blue-50 font-black'
                            : 'hover:text-blue-600 hover:bg-gray-50'
                        }`}
                        id={`comment-toggle-${post.id}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Komentar ({post.comments_count || 0})</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Comments Drawer */}
                  {isCommentsOpen && (
                    <div className="pt-3 border-t border-gray-100 space-y-3 bg-[#FAF6F0] -mx-5 -mb-5 p-5 rounded-b-2xl">
                      <div className="text-[11px] font-black uppercase text-gray-700">
                        Komentar ({postComments.length})
                      </div>

                      {/* Comment Input Form */}
                      <form
                        onSubmit={(e) => handleAddComment(post.id, e)}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          required
                          placeholder="Tulis tanggapan / komentar Anda..."
                          value={commentInputMap[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputMap((prev) => ({
                              ...prev,
                              [post.id]: e.target.value
                            }))
                          }
                          className="flex-1 px-3 py-2 bg-white neo-border-thin rounded-xl text-xs font-medium focus:outline-none focus:border-[#FF8B7B]"
                        />
                        <button
                          type="submit"
                          disabled={submittingCommentMap[post.id]}
                          className="px-4 py-2 bg-[#FF8B7B] hover:bg-[#ff9f8f] text-gray-900 neo-border rounded-xl font-black text-xs cursor-pointer shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>

                      {/* Comments List */}
                      {isLoadingComments ? (
                        <div className="py-4 text-center text-xs font-bold text-gray-400">
                          Memuat komentar...
                        </div>
                      ) : postComments.length === 0 ? (
                        <div className="py-2 text-center text-[11px] font-bold text-gray-400">
                          Belum ada komentar. Berikan tanggapan pertama Anda!
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {postComments.map((comm) => {
                            const isCommAuthorAdmin =
                              comm.author_profile?.role === 'admin' ||
                              comm.author_profile?.username === 'admin';
                            return (
                              <div
                                key={comm.id}
                                className="bg-white rounded-xl neo-border-thin p-3 space-y-1 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#B4D3FF] neo-border-thin flex items-center justify-center text-xs">
                                      {comm.author_profile?.avatar_url || (isCommAuthorAdmin ? '🛡️' : '👩‍🏫')}
                                    </div>
                                    <span className="font-extrabold text-gray-900">
                                      {comm.author_profile?.nama_lengkap || 'Guru EMKAIN'}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                      @{comm.author_profile?.username || 'guru'}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-gray-400 font-bold">
                                    {new Date(comm.created_at).toLocaleTimeString('id-ID', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <p className="text-gray-800 font-medium pl-8 leading-relaxed">
                                  {comm.content}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: ANGGOTA EMKAIN DIRECTORY (3 cols on lg) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 bg-white rounded-2xl neo-border neo-shadow p-5 sticky top-4 space-y-4" id="community-members-directory">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-sm font-black uppercase text-gray-900 font-display flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Anggota EMKAIN ({members.length})</span>
            </h3>
          </div>

          {/* Search Member */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari guru atau anggota..."
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              className="w-full pl-8.5 pr-3 py-2 bg-[#FAF6F0] neo-border-thin rounded-xl text-xs font-bold focus:outline-none focus:border-[#FF8B7B]"
            />
          </div>

          {/* Member Filter Chips */}
          <div className="flex flex-wrap gap-1.5 pb-1">
            {(['ALL', 'ONLINE', 'OFFLINE', 'ADMIN', 'GURU'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setMemberFilter(filterKey)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase neo-border-thin cursor-pointer transition-all ${
                  memberFilter === filterKey
                    ? 'bg-[#FF8B7B] text-gray-900 shadow-xs'
                    : 'bg-[#FAF6F0] text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filterKey === 'ALL' ? 'SEMUA' : filterKey}
              </button>
            ))}
          </div>

          {/* Member List */}
          {loadingMembers ? (
            <div className="py-8 text-center text-xs font-bold text-gray-400">
              Memuat data anggota...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-6 text-center text-xs font-bold text-gray-400">
              Tidak ada anggota ditemukan
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1" id="members-list-scroll">
              {filteredMembers.map((member) => {
                const isMemberAdmin = member.role === 'admin' || member.email?.toLowerCase().trim() === 'admin@gmail.com';
                const isSelf = member.id === profile.id;

                return (
                  <div
                    key={member.id}
                    className="p-3 bg-[#FAF6F0] rounded-xl neo-border-thin space-y-2.5 hover:bg-amber-50/50 transition-colors"
                    id={`member-item-${member.id}`}
                  >
                    {/* Top Identity */}
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                        onClick={() => handleOpenUserProfile(member)}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-[#FFD166] neo-border-thin flex items-center justify-center text-lg">
                            {member.avatar_url || (isMemberAdmin ? '🛡️' : '👩‍🏫')}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              member.is_online ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <h4 className="font-extrabold text-xs text-gray-900 truncate hover:underline">
                              {member.nama_lengkap}
                            </h4>
                            {isMemberAdmin && (
                              <ShieldCheck className="w-3 h-3 text-amber-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 font-bold truncate">
                            @{member.username}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full neo-border-thin text-[8px] font-black uppercase flex-shrink-0 ${
                          isMemberAdmin ? 'bg-[#FFD166] text-gray-900' : 'bg-[#B4D3FF] text-gray-900'
                        }`}
                      >
                        {isMemberAdmin ? 'ADMIN' : 'GURU'}
                      </span>
                    </div>

                    {/* Status & Last Seen */}
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-gray-500">
                      <span className={member.is_online ? 'text-emerald-700' : 'text-gray-500'}>
                        {formatLastSeen(member.last_seen_at, member.is_online)}
                      </span>
                    </div>

                    {/* Message Button */}
                    {!isSelf && (
                      <button
                        onClick={() => handleStartChat(member)}
                        className="w-full py-1.5 bg-white hover:bg-gray-100 text-gray-900 neo-border-thin rounded-lg font-black text-[10px] uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        id={`chat-with-${member.id}-btn`}
                      >
                        <MessageSquare className="w-3 h-3 text-[#FF8B7B]" />
                        <span>KIRIM PESAN</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedUserForModal}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onStartChat={handleStartChat}
        currentUserId={profile.id}
      />
    </div>
  );
}
