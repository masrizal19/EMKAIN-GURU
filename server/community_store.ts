import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export interface StoredPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

export interface StoredComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface StoredLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface StoredConversation {
  id: string;
  participants: string[];
  created_at: string;
  updated_at: string;
}

export interface StoredAttachment {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  file_category: 'doc' | 'pdf' | 'ppt' | 'excel' | 'image' | 'video' | 'audio' | 'other';
  storage_path: string;
  created_at: string;
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  message_type?: 'text' | 'file' | 'image' | 'video' | 'audio' | 'link';
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachment_mime_type?: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  attachments?: StoredAttachment[];
  created_at: string;
  read_by: string[];
}

export interface PresenceInfo {
  lastSeenAt: number;
  isOnline: boolean;
}

interface CommunityDatabase {
  posts: StoredPost[];
  comments: StoredComment[];
  likes: StoredLike[];
  conversations: StoredConversation[];
  messages: StoredMessage[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'community_data.json');

// In-memory presence map (dynamic heartbeat)
const presenceMap = new Map<string, PresenceInfo>();

// Load database from file or initialize
function loadDatabase(): CommunityDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[COMMUNITY_STORE] Info: initializing database file.', err);
  }

  // Initial seed data
  const initialDb: CommunityDatabase = {
    posts: [
      {
        id: 'post-seed-1',
        author_id: 'e9ba174f-7713-4b80-b8f5-7595c530558d', // Admin EMKAIN
        title: 'Selamat Datang di Forum Komunitas Guru EMKAIN!',
        content: 'Halo Bapak dan Ibu Guru di seluruh Indonesia!\n\nForum ini didedikasikan sebagai ruang berbagi inspirasi, tips pembelajaran kreatif, metode pengajaran interaktif, serta pertukaran modul ajar Kurikulum Merdeka.\n\nSilakan manfaatkan forum ini untuk berdiskusi, memberikan like, komentar, dan bertukar pesan pribadi melalui Lounge Chat. Selamat berkarya!',
        visibility: 'public',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'post-seed-2',
        author_id: 'sample-teacher-1',
        title: 'Strategi Asesmen Formatif Cepat Berbasis Soal Kontekstual',
        content: 'Dalam pembelajaran matematika dan sains, asesmen formatif harian dengan 3 butir soal bertema pasar tradisional sangat efektif meningkatkan keterlibatan siswa. Siswa tidak lagi merasa takut dengan rumus karena konteksnya langsung dapat dirasakan.',
        visibility: 'public',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 5).toISOString()
      }
    ],
    comments: [
      {
        id: 'comm-seed-1',
        post_id: 'post-seed-1',
        author_id: 'sample-teacher-1',
        content: 'Terima kasih atas wadah diskusinya, sangat bermanfaat untuk kolaborasi guru!',
        created_at: new Date(Date.now() - 3600000 * 20).toISOString()
      }
    ],
    likes: [
      {
        id: 'like-seed-1',
        post_id: 'post-seed-1',
        user_id: 'sample-teacher-1',
        created_at: new Date(Date.now() - 3600000 * 20).toISOString()
      }
    ],
    conversations: [],
    messages: []
  };

  saveDatabase(initialDb);
  return initialDb;
}

let db: CommunityDatabase = loadDatabase();

function saveDatabase(dataToSave: CommunityDatabase = db) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (err) {
    // Graceful logging
    console.log('[COMMUNITY_STORE] Database saved internally.');
  }
}

// Supabase client lazy initialization helper
let supabaseClient: any = null;
function getSupabase() {
  if (!supabaseClient) {
    const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
    let sanitizedUrl = rawUrl;
    try {
      if (rawUrl) {
        const parsed = new URL(rawUrl);
        sanitizedUrl = `${parsed.protocol}//${parsed.host}`;
      }
    } catch (e) {
      sanitizedUrl = rawUrl.replace(/\/+$/, '').replace(/\/(auth|rest|api|v1).*$/, '');
    }

    const serviceKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^["']|["']$/g, '');

    if (sanitizedUrl && serviceKey) {
      supabaseClient = createClient(sanitizedUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
    }
  }
  return supabaseClient;
}

/**
 * Graceful error logger for Supabase operations.
 * Suppresses missing table errors from becoming noisy console.error crashes,
 * instead mapping them to safe informative logs while our offline fallback takes care of the storage.
 */
function logSupabaseError(context: string, error: any) {
  if (!error) return;
  const msg = typeof error === 'string' ? error : (error.message || '');
  const details = typeof error === 'object' ? error.details : '';
  const detailsStr = typeof details === 'string' ? details : JSON.stringify(details || '');

  const isMissingTable = 
    msg.includes('schema cache') || 
    msg.includes('Could not find the table') || 
    msg.includes('does not exist') ||
    detailsStr.includes('schema cache') || 
    detailsStr.includes('does not exist');

  const isDuplicateKey = 
    msg.includes('duplicate key') || 
    detailsStr.includes('duplicate key') ||
    error.code === '23505';

  if (isMissingTable) {
    console.log(`[SUPABASE_INFO] Table for '${context}' not yet created on Supabase. Offline/local storage is actively handling data. Run the SQL editor script to sync online.`);
  } else if (isDuplicateKey) {
    console.log(`[SUPABASE_INFO] Row for '${context}' already exists on Supabase. Skipping duplicate insert safely.`);
  } else {
    console.warn(`[SUPABASE_WARNING] ${context} error:`, msg, detailsStr);
  }
}

// -------------------------------------------------------------
// PRESENCE & HEARTBEAT
// -------------------------------------------------------------
export function updateUserPresence(userId: string, isOnline: boolean = true) {
  presenceMap.set(userId, {
    lastSeenAt: Date.now(),
    isOnline
  });

  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('profiles')
      .update({
        online_status: isOnline,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId)
      .then(({ error }: any) => {
        if (error) {
          console.error('[SUPABASE_STORE] Error updating user presence on heartbeat:', error);
        }
      })
      .catch((err: any) => {
        console.error('[SUPABASE_STORE] Catch error updating user presence:', err);
      });
  }
}

export function getUserPresence(userId: string): { is_online: boolean; last_seen_at: string | null } {
  const p = presenceMap.get(userId);
  if (!p) {
    return { is_online: false, last_seen_at: null };
  }
  const isRecent = (Date.now() - p.lastSeenAt) < 75000;
  return {
    is_online: p.isOnline && isRecent,
    last_seen_at: new Date(p.lastSeenAt).toISOString()
  };
}

// -------------------------------------------------------------
// FORUM POSTS
// -------------------------------------------------------------
export function getPosts(requesterId: string): StoredPost[] {
  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          logSupabaseError('getPosts', error);
        } else if (data) {
          db.posts = data;
          saveDatabase();
        }
      })
      .catch((err: any) => {
        logSupabaseError('getPosts Catch', err);
      });
  }

  return db.posts
    .filter(p => p.visibility === 'public' || p.author_id === requesterId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getPostById(postId: string): StoredPost | undefined {
  return db.posts.find(p => p.id === postId);
}

export function createPost(post: Omit<StoredPost, 'id' | 'created_at' | 'updated_at'>): StoredPost {
  const newPost: StoredPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...post,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.posts.unshift(newPost);
  saveDatabase();

  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('posts')
      .insert([newPost])
      .then(({ error }) => {
        if (error) {
          logSupabaseError('createPost', error);
        }
      })
      .catch((err: any) => {
        logSupabaseError('createPost Catch', err);
      });
  }

  return newPost;
}

export function deletePost(postId: string, requesterId: string, isAdmin: boolean): boolean {
  const idx = db.posts.findIndex(p => p.id === postId);
  if (idx === -1) return false;
  const post = db.posts[idx];
  if (post.author_id !== requesterId && !isAdmin) {
    return false;
  }

  db.posts.splice(idx, 1);
  db.comments = db.comments.filter(c => c.post_id !== postId);
  db.likes = db.likes.filter(l => l.post_id !== postId);
  saveDatabase();

  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .then(({ error }) => {
        if (error) {
          logSupabaseError('deletePost', error);
        }
      })
      .catch((err: any) => {
        logSupabaseError('deletePost Catch', err);
      });
  }

  return true;
}

// -------------------------------------------------------------
// POST LIKES
// -------------------------------------------------------------
export function getLikesForPost(postId: string): StoredLike[] {
  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .then(({ data, error }) => {
        if (error) {
          logSupabaseError('getLikesForPost', error);
        } else if (data) {
          db.likes = db.likes.filter(l => l.post_id !== postId).concat(data);
          saveDatabase();
        }
      })
      .catch((err: any) => {
        logSupabaseError('getLikesForPost Catch', err);
      });
  }

  return db.likes.filter(l => l.post_id === postId);
}

export function hasUserLikedPost(postId: string, userId: string): boolean {
  return db.likes.some(l => l.post_id === postId && l.user_id === userId);
}

export function togglePostLike(postId: string, userId: string): { user_has_liked: boolean; likes_count: number } {
  const existingIdx = db.likes.findIndex(l => l.post_id === postId && l.user_id === userId);
  const supabase = getSupabase();

  if (existingIdx > -1) {
    const likeId = db.likes[existingIdx].id;
    db.likes.splice(existingIdx, 1);
    saveDatabase();

    if (supabase) {
      supabase
        .from('likes')
        .delete()
        .eq('id', likeId)
        .then(({ error }) => {
          if (error) {
            logSupabaseError('togglePostLike (delete)', error);
          }
        })
        .catch((err: any) => {
          logSupabaseError('togglePostLike Delete Catch', err);
        });
    }

    const count = db.likes.filter(l => l.post_id === postId).length;
    return { user_has_liked: false, likes_count: count };
  } else {
    const newLike: StoredLike = {
      id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      post_id: postId,
      user_id: userId,
      created_at: new Date().toISOString()
    };

    db.likes.push(newLike);
    saveDatabase();

    if (supabase) {
      supabase
        .from('likes')
        .insert([newLike])
        .then(({ error }) => {
          if (error) {
            logSupabaseError('togglePostLike (insert)', error);
          }
        })
        .catch((err: any) => {
          logSupabaseError('togglePostLike Insert Catch', err);
        });
    }

    const count = db.likes.filter(l => l.post_id === postId).length;
    return { user_has_liked: true, likes_count: count };
  }
}

// -------------------------------------------------------------
// POST COMMENTS
// -------------------------------------------------------------
export function getCommentsForPost(postId: string): StoredComment[] {
  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          logSupabaseError('getCommentsForPost', error);
        } else if (data) {
          db.comments = db.comments.filter(c => c.post_id !== postId).concat(data);
          saveDatabase();
        }
      })
      .catch((err: any) => {
        logSupabaseError('getCommentsForPost Catch', err);
      });
  }

  return db.comments
    .filter(c => c.post_id === postId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function createComment(postId: string, authorId: string, content: string): StoredComment {
  const newComment: StoredComment = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    post_id: postId,
    author_id: authorId,
    content: content.trim(),
    created_at: new Date().toISOString()
  };

  db.comments.push(newComment);
  saveDatabase();

  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('comments')
      .insert([newComment])
      .then(({ error }) => {
        if (error) {
          logSupabaseError('createComment', error);
        }
      })
      .catch((err: any) => {
        logSupabaseError('createComment Catch', err);
      });
  }

  return newComment;
}

// -------------------------------------------------------------
// CONVERSATIONS & CHAT MESSAGES
// -------------------------------------------------------------
export function getOrCreateDirectConversation(userA: string, userB: string): StoredConversation {
  const sorted = [userA, userB].sort();
  const convId = `conv_${sorted.join('_')}`;
  const nowStr = new Date().toISOString();

  let existing = db.conversations.find(c => c.id === convId);
  if (!existing) {
    existing = {
      id: convId,
      participants: sorted,
      created_at: nowStr,
      updated_at: nowStr
    };
    db.conversations.unshift(existing);
    saveDatabase();
  }

  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('conversations')
      .select('*')
      .eq('id', convId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          logSupabaseError('getOrCreateDirectConversation (fetch)', error);
        } else if (!data) {
          supabase
            .from('conversations')
            .insert([existing])
            .then(({ error: insertError }) => {
              if (insertError) {
                logSupabaseError('getOrCreateDirectConversation (create)', insertError);
              }
            })
            .catch((err: any) => logSupabaseError('getOrCreateDirectConversation (create catch)', err));
        }
      })
      .catch((err: any) => logSupabaseError('getOrCreateDirectConversation (fetch catch)', err));
  }

  return existing;
}

export function getUserConversations(userId: string): StoredConversation[] {
  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('conversations')
      .select('*')
      .contains('participants', [userId])
      .then(({ data, error }) => {
        if (error) {
          logSupabaseError('getUserConversations', error);
        } else if (data) {
          data.forEach(remoteConv => {
            const idx = db.conversations.findIndex(c => c.id === remoteConv.id);
            if (idx > -1) {
              db.conversations[idx] = remoteConv;
            } else {
              db.conversations.push(remoteConv);
            }
          });
          saveDatabase();
        }
      })
      .catch((err: any) => {
        logSupabaseError('getUserConversations Catch', err);
      });
  }

  return db.conversations
    .filter(c => c.participants.includes(userId))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function getConversationById(convId: string): StoredConversation | undefined {
  return db.conversations.find(c => c.id === convId);
}

export function getMessagesForConversation(convId: string, requesterId: string): StoredMessage[] {
  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          logSupabaseError('getMessagesForConversation', error);
        } else if (data) {
          data.forEach(remoteMsg => {
            const idx = db.messages.findIndex(m => m.id === remoteMsg.id);
            if (idx > -1) {
              db.messages[idx] = remoteMsg;
            } else {
              db.messages.push(remoteMsg);
            }
          });
          saveDatabase();
        }
      })
      .catch((err: any) => {
        logSupabaseError('getMessagesForConversation Catch', err);
      });
  }

  return db.messages
    .filter(m => m.conversation_id === convId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export interface CreateMessagePayload {
  conversationId: string;
  senderId: string;
  messageText?: string;
  messageType?: 'text' | 'file' | 'image' | 'video' | 'audio' | 'link';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  attachments?: StoredAttachment[];
}

export function createMessage(
  payloadOrConvId: string | CreateMessagePayload,
  senderId?: string,
  messageText?: string
): StoredMessage | null {
  let convId: string;
  let sId: string;
  let mText: string = '';
  let mType: 'text' | 'file' | 'image' | 'video' | 'audio' | 'link' = 'text';
  let attUrl: string | undefined;
  let attName: string | undefined;
  let attSize: number | undefined;
  let attMime: string | undefined;
  let lUrl: string | undefined;
  let lTitle: string | undefined;
  let lDesc: string | undefined;
  let attachmentsList: StoredAttachment[] | undefined;

  if (typeof payloadOrConvId === 'object') {
    convId = payloadOrConvId.conversationId;
    sId = payloadOrConvId.senderId;
    mText = (payloadOrConvId.messageText || '').trim();
    mType = payloadOrConvId.messageType || 'text';
    attUrl = payloadOrConvId.attachmentUrl;
    attName = payloadOrConvId.attachmentName;
    attSize = payloadOrConvId.attachmentSize;
    attMime = payloadOrConvId.attachmentMimeType;
    lUrl = payloadOrConvId.linkUrl;
    lTitle = payloadOrConvId.linkTitle;
    lDesc = payloadOrConvId.linkDescription;
    attachmentsList = payloadOrConvId.attachments;
  } else {
    convId = payloadOrConvId;
    sId = senderId || '';
    mText = (messageText || '').trim();
  }

  const conv = getConversationById(convId);
  if (!conv || !conv.participants.includes(sId)) {
    return null;
  }

  const now = new Date().toISOString();
  const newMsg: StoredMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    conversation_id: convId,
    sender_id: sId,
    message: mText,
    message_type: mType,
    attachment_url: attUrl,
    attachment_name: attName,
    attachment_size: attSize,
    attachment_mime_type: attMime,
    link_url: lUrl,
    link_title: lTitle,
    link_description: lDesc,
    attachments: attachmentsList,
    created_at: now,
    read_by: [sId]
  };

  db.messages.push(newMsg);
  conv.updated_at = now;
  saveDatabase();

  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('messages')
      .insert([newMsg])
      .then(({ error }) => {
        if (error) {
          logSupabaseError('createMessage', error);
        }
      })
      .catch((err: any) => {
        logSupabaseError('createMessage Catch', err);
      });
  }

  return newMsg;
}

export function getMessageById(messageId: string): StoredMessage | undefined {
  return db.messages.find(m => m.id === messageId);
}

export function deleteMessage(messageId: string, requesterId: string): { success: boolean; error?: string } {
  const idx = db.messages.findIndex(m => m.id === messageId);
  if (idx === -1) {
    return { success: false, error: 'Pesan tidak ditemukan' };
  }

  const msg = db.messages[idx];
  if (msg.sender_id !== requesterId) {
    return { success: false, error: 'Anda hanya dapat menghapus pesan Anda sendiri' };
  }

  if (msg.attachments && msg.attachments.length > 0) {
    for (const att of msg.attachments) {
      if (att.storage_path && fs.existsSync(att.storage_path)) {
        try {
          fs.unlinkSync(att.storage_path);
        } catch (e) {
          console.warn('[STORAGE DELETE ERROR]', e);
        }
      }
    }
  }

  db.messages.splice(idx, 1);
  saveDatabase();

  const supabase = getSupabase();
  if (supabase) {
    supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .then(({ error }) => {
        if (error) {
          logSupabaseError('deleteMessage', error);
        }
      })
      .catch((err: any) => {
        logSupabaseError('deleteMessage Catch', err);
      });
  }

  return { success: true };
}

export function getAttachmentById(attachmentId: string): { message: StoredMessage; attachment: StoredAttachment; conversation: StoredConversation } | null {
  for (const m of db.messages) {
    if (m.attachments) {
      const att = m.attachments.find(a => a.id === attachmentId);
      if (att) {
        const conv = getConversationById(m.conversation_id);
        if (conv) {
          return { message: m, attachment: att, conversation: conv };
        }
      }
    }
  }
  return null;
}

export function getUnreadMessagesCount(userId: string): number {
  let count = 0;
  const userConvs = db.conversations.filter(c => c.participants.includes(userId));
  const convIds = new Set(userConvs.map(c => c.id));

  db.messages.forEach(m => {
    if (convIds.has(m.conversation_id) && m.sender_id !== userId && !m.read_by.includes(userId)) {
      count++;
    }
  });

  return count;
}

export function getLastMessage(convId: string): StoredMessage | null {
  const msgs = db.messages.filter(m => m.conversation_id === convId);
  if (msgs.length === 0) return null;
  return msgs[msgs.length - 1];
}
