import { supabase } from './supabase';
import { UserProfile, Conversation, ChatMessage, ForumPost, ForumComment } from '../types';

/**
 * Detects if the current frontend is running as a static production build (SPA)
 * deployed on app.mkverse.my.id, which does not have access to the local container Express server.
 */
export const isProductionStaticBuild = (): boolean => {
  const hostname = window.location.hostname;
  return (
    hostname === 'app.mkverse.my.id' ||
    hostname === 'mkverse.my.id' ||
    (!import.meta.env.DEV && !hostname.includes('.run.app'))
  );
};

// Map raw Supabase profiles to frontend UserProfile
export function isUserOnline(onlineStatus: boolean | undefined, lastSeen: string | Date | null | undefined): boolean {
  if (!onlineStatus) return false;
  if (!lastSeen) return false;
  const lastSeenTime = new Date(lastSeen).getTime();
  const timeDifference = Date.now() - lastSeenTime;
  return timeDifference < 75000; // 75 seconds timeout fallback
}

export function mapProfile(p: any): UserProfile {
  const email = (p.email || '').toLowerCase().trim();
  const isOfficialAdmin = email === 'admin@gmail.com' || p.role === 'admin';
  const role = isOfficialAdmin ? 'admin' : (p.role || 'guru');

  const lastSeenVal = p.last_seen || p.last_seen_at || null;
  const isOnline = isUserOnline(p.online_status, lastSeenVal);

  return {
    id: p.id,
    username: p.username || (email ? email.split('@')[0] : `user_${p.id.substring(0, 5)}`),
    nama_lengkap: p.nama_lengkap || 'Anggota EMKAIN',
    avatar_url: p.avatar_url || (role === 'admin' ? '🛡️' : '👩‍🏫'),
    role: role as 'admin' | 'guru',
    status: p.status || 'aktif',
    sekolah: p.sekolah || 'SMK Multi Karya',
    mata_pelajaran: p.mata_pelajaran || '',
    kelas: p.kelas || '',
    email: email,
    is_online: isOnline,
    last_seen_at: lastSeenVal ? new Date(lastSeenVal).toISOString() : null,
    online_status: !!p.online_status,
    last_seen: lastSeenVal ? new Date(lastSeenVal).toISOString() : null,
    created_at: p.created_at
  };
}

/**
 * Update current user's presence status in Supabase profiles.
 * Works dynamically in both development and production.
 */
export async function updatePresenceDirect(userId: string, isOnline: boolean): Promise<void> {
  try {
    const payload = {
      online_status: isOnline,
      last_seen: new Date().toISOString()
    };
    await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);
  } catch (err) {
    console.error('[SUPABASE_STORE] updatePresenceDirect error:', err);
  }
}

// -------------------------------------------------------------
// PROFILE & COMMUNITY MEMBERS
// -------------------------------------------------------------
export async function fetchMembersDirect(currentUserId: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', currentUserId);

  if (error || !data) {
    console.error('[SUPABASE_STORE] fetchMembersDirect error:', error);
    return [];
  }
  return data.map(mapProfile);
}

// -------------------------------------------------------------
// CHAT CONVERSATIONS & MESSAGES DIRECT
// -------------------------------------------------------------
export async function fetchConversationsDirect(currentUserId: string): Promise<Conversation[]> {
  // 1. Fetch conversations containing the user
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('*')
    .contains('participants', [currentUserId]);

  if (error || !convs) {
    console.error('[SUPABASE_STORE] fetchConversationsDirect error:', error);
    return [];
  }

  // 2. Fetch all profiles to resolve other_user
  const { data: rawProfiles } = await supabase
    .from('profiles')
    .select('*');

  const profilesMap = new Map<string, UserProfile>();
  if (rawProfiles) {
    rawProfiles.forEach(p => {
      profilesMap.set(p.id, mapProfile(p));
    });
  }

  // 3. Fetch all messages to resolve last_message and unread_count
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  const result: Conversation[] = [];

  for (const c of convs) {
    const otherUserId = c.participants.find((pId: string) => pId !== currentUserId) || currentUserId;
    const otherUser = profilesMap.get(otherUserId);

    // Filter messages for this conversation
    const convMsgs = (messages || []).filter(m => m.conversation_id === c.id);
    const lastMsg = convMsgs.length > 0 ? convMsgs[convMsgs.length - 1] : null;

    // Calculate unread count (messages sent by others not in read_by)
    const unreadCount = convMsgs.filter(
      m => m.sender_id !== currentUserId && (!m.read_by || !m.read_by.includes(currentUserId))
    ).length;

    result.push({
      id: c.id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      participants: c.participants,
      other_user: otherUser,
      last_message: lastMsg ? {
        message: lastMsg.message || '',
        sender_id: lastMsg.sender_id,
        created_at: lastMsg.created_at,
        message_type: lastMsg.message_type
      } : null,
      unread_count: unreadCount
    });
  }

  // Sort by updated_at descending
  return result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function fetchMessagesDirect(convId: string, currentUserId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('[SUPABASE_STORE] fetchMessagesDirect error:', error);
    return [];
  }

  // Mark unread messages as read by currentUserId
  const unreadMsgs = data.filter(m => m.sender_id !== currentUserId && (!m.read_by || !m.read_by.includes(currentUserId)));
  if (unreadMsgs.length > 0) {
    for (const m of unreadMsgs) {
      const updatedReadBy = Array.from(new Set([...(m.read_by || []), currentUserId]));
      await supabase
        .from('messages')
        .update({ read_by: updatedReadBy })
        .eq('id', m.id);
    }
  }

  return data;
}

export async function startDirectConversationDirect(currentUserId: string, targetUserId: string): Promise<Conversation> {
  const sorted = [currentUserId, targetUserId].sort();
  const convId = `conv_${sorted.join('_')}`;

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', convId)
    .maybeSingle();

  if (existing) {
    const list = await fetchConversationsDirect(currentUserId);
    const found = list.find(c => c.id === convId);
    if (found) return found;
  }

  // Insert new conversation
  const newConv = {
    id: convId,
    participants: sorted,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await supabase.from('conversations').insert([newConv]);

  const list = await fetchConversationsDirect(currentUserId);
  return list.find(c => c.id === convId) || {
    id: convId,
    participants: sorted,
    created_at: newConv.created_at,
    updated_at: newConv.updated_at,
    unread_count: 0
  };
}

export async function sendMessageDirect(
  convId: string,
  senderId: string,
  payload: {
    message: string;
    message_type: 'text' | 'file' | 'image' | 'video' | 'audio' | 'link';
    attachments?: any[];
    link_url?: string;
    link_title?: string;
    link_description?: string;
  }
): Promise<ChatMessage> {
  const now = new Date().toISOString();
  const firstAttachment = payload.attachments && payload.attachments.length > 0 ? payload.attachments[0] : null;

  const newMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    conversation_id: convId,
    sender_id: senderId,
    message: payload.message,
    message_type: payload.message_type,
    attachment_url: firstAttachment?.url || null,
    attachment_name: firstAttachment?.name || null,
    attachment_size: firstAttachment?.size || null,
    attachment_mime_type: firstAttachment?.mime_type || null,
    link_url: payload.link_url || null,
    link_title: payload.link_title || null,
    link_description: payload.link_description || null,
    created_at: now,
    read_by: [senderId]
  };

  const { error } = await supabase
    .from('messages')
    .insert([newMsg]);

  if (error) {
    console.error('[SUPABASE_STORE] sendMessageDirect error:', error);
  }

  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: now })
    .eq('id', convId);

  return newMsg as ChatMessage;
}

export async function deleteMessageDirect(msgId: string): Promise<boolean> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', msgId);

  if (error) {
    console.error('[SUPABASE_STORE] deleteMessageDirect error:', error);
    return false;
  }
  return true;
}

// -------------------------------------------------------------
// FORUM POSTS, COMMENTS & LIKES DIRECT
// -------------------------------------------------------------
export async function fetchPostsDirect(currentUserId: string): Promise<ForumPost[]> {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !posts) {
    console.error('[SUPABASE_STORE] fetchPostsDirect error:', error);
    return [];
  }

  const { data: likes } = await supabase.from('likes').select('*');
  const { data: comments } = await supabase.from('comments').select('*');
  const { data: rawProfiles } = await supabase.from('profiles').select('*');

  const profilesMap = new Map<string, UserProfile>();
  if (rawProfiles) {
    rawProfiles.forEach(p => {
      profilesMap.set(p.id, mapProfile(p));
    });
  }

  return posts.map(p => {
    const postLikes = (likes || []).filter(l => l.post_id === p.id);
    const postComments = (comments || []).filter(c => c.post_id === p.id);
    const userHasLiked = postLikes.some(l => l.user_id === currentUserId);
    const authorProfile = profilesMap.get(p.author_id) || null;

    return {
      id: p.id,
      author_id: p.author_id,
      title: p.title,
      content: p.content,
      visibility: p.visibility,
      created_at: p.created_at,
      updated_at: p.updated_at,
      likes_count: postLikes.length,
      comments_count: postComments.length,
      user_has_liked: userHasLiked,
      author_profile: authorProfile
    };
  });
}

export async function createPostDirect(
  authorId: string,
  payload: { title: string; content: string; visibility: 'public' | 'private' }
): Promise<ForumPost | null> {
  const now = new Date().toISOString();
  const newPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    author_id: authorId,
    title: payload.title,
    content: payload.content,
    visibility: payload.visibility,
    created_at: now,
    updated_at: now
  };

  const { error } = await supabase
    .from('posts')
    .insert([newPost]);

  if (error) {
    console.error('[SUPABASE_STORE] createPostDirect error:', error);
    return null;
  }

  const { data: author } = await supabase.from('profiles').select('*').eq('id', authorId).single();

  return {
    ...newPost,
    likes_count: 0,
    comments_count: 0,
    user_has_liked: false,
    author_profile: author ? mapProfile(author) : null
  };
}

export async function deletePostDirect(postId: string): Promise<boolean> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('[SUPABASE_STORE] deletePostDirect error:', error);
    return false;
  }
  return true;
}

export async function togglePostLikeDirect(postId: string, currentUserId: string): Promise<{ user_has_liked: boolean; likes_count: number }> {
  const { data: existing } = await supabase
    .from('likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', currentUserId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('likes')
      .delete()
      .eq('id', existing.id);
  } else {
    const newLike = {
      id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      post_id: postId,
      user_id: currentUserId,
      created_at: new Date().toISOString()
    };
    await supabase.from('likes').insert([newLike]);
  }

  const { data: allLikes } = await supabase.from('likes').select('*').eq('post_id', postId);
  const count = allLikes ? allLikes.length : 0;
  const userHasLiked = allLikes ? allLikes.some(l => l.user_id === currentUserId) : false;

  return {
    user_has_liked: userHasLiked,
    likes_count: count
  };
}

export async function fetchCommentsDirect(postId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('[SUPABASE_STORE] fetchCommentsDirect error:', error);
    return [];
  }

  const { data: rawProfiles } = await supabase.from('profiles').select('*');
  const profilesMap = new Map<string, UserProfile>();
  if (rawProfiles) {
    rawProfiles.forEach(p => {
      profilesMap.set(p.id, mapProfile(p));
    });
  }

  return data.map(c => ({
    id: c.id,
    post_id: c.post_id,
    author_id: c.author_id,
    content: c.content,
    created_at: c.created_at,
    author_profile: profilesMap.get(c.author_id) || null
  }));
}

export async function createCommentDirect(postId: string, authorId: string, content: string): Promise<any | null> {
  const newComment = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    post_id: postId,
    author_id: authorId,
    content: content.trim(),
    created_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('comments')
    .insert([newComment]);

  if (error) {
    console.error('[SUPABASE_STORE] createCommentDirect error:', error);
    return null;
  }

  const { data: author } = await supabase.from('profiles').select('*').eq('id', authorId).single();

  return {
    ...newComment,
    author_profile: author ? mapProfile(author) : null
  };
}
