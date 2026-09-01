/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// CORS configuration middleware (Custom robust CORS solution)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['https://app.mkverse.my.id', 'https://api.mkverse.my.id'];
  
  if (origin && (allowedOrigins.includes(origin) || origin.startsWith('https://ais-') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://app.mkverse.my.id');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
const supabaseAnonKey = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^["']|["']$/g, '');

function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    let cleaned = trimmed.replace(/\/+$/, '');
    cleaned = cleaned.replace(/\/(auth|rest|api|v1).*$/, '');
    return cleaned;
  }
}

function getSupabaseUrl() {
  const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
  return sanitizeSupabaseUrl(rawUrl);
}
function getSupabaseAnonKey() {
  return (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');
}
function getSupabaseServiceRoleKey() {
  return (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^["']|["']$/g, '');
}

// Lazy-check for Supabase admin configurations
function isSupabaseConfigured() {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  const service = getSupabaseServiceRoleKey();
  return !!(url && url.startsWith('http') && anon && service);
}

// -------------------------------------------------------------
// HEALTH CHECK ENDPOINT
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// -------------------------------------------------------------
// TEMPORARY RECOVERY ENDPOINT: Reset Admin Password (Admin Access Recovery)
// -------------------------------------------------------------
app.post('/api/recovery/reset-admin-password', async (req, res): Promise<any> => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'Supabase service role credentials not configured in environment.'
      });
    }

    const { password, adminUserId } = req.body;
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password baru wajib diisi dan minimal 6 karakter.'
      });
    }

    const serviceRoleKey = getSupabaseServiceRoleKey();
    const serviceClient = createClient(getSupabaseUrl(), serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let targetUserId = (adminUserId || 'e9ba174f-7713-4b80-b8f5-7595c530558d').trim();

    // 1. Attempt updating user password directly by user ID
    let { data: updateData, error: updateError } = await serviceClient.auth.admin.updateUserById(
      targetUserId,
      {
        password: password,
        email_confirm: true
      }
    );

    // If initial ID failed or was invalid, attempt lookup by email 'admin@gmail.com'
    if (updateError) {
      console.error('[RECOVERY] Initial update by ID returned error:', updateError.message);
      
      const { data: listData, error: listError } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 50 });
      if (!listError && listData?.users) {
        const foundAdmin = (listData.users as any[]).find(
          (u: any) => u.email?.toLowerCase() === 'admin@gmail.com'
        );
        if (foundAdmin?.id) {
          targetUserId = foundAdmin.id;
          const retryResult = await serviceClient.auth.admin.updateUserById(
            targetUserId,
            {
              password: password,
              email_confirm: true
            }
          );
          updateData = retryResult.data;
          updateError = retryResult.error;
        }
      }
    }

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message || 'Gagal memperbarui password admin di Supabase Auth.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password admin berhasil diperbarui.'
    });
  } catch (err: any) {
    console.error('[RECOVERY_ERROR]', err?.message || 'Unknown error');
    return res.status(500).json({
      success: false,
      error: err?.message || 'Terjadi kesalahan pada server saat reset password.'
    });
  }
});

// Helper: Verify requester is the official Admin (admin@gmail.com with role admin)
async function verifyAdminRequester(authHeader?: string): Promise<{ valid: boolean; user?: any; errorStatus?: number; errorResponse?: any }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      errorStatus: 401,
      errorResponse: { error: 'UNAUTHORIZED', message: 'Token otentikasi tidak ditemukan.' }
    };
  }

  const token = authHeader.split(' ')[1].trim();
  if (!token) {
    return {
      valid: false,
      errorStatus: 401,
      errorResponse: { error: 'UNAUTHORIZED', message: 'Token otentikasi kosong.' }
    };
  }

  const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
  if (userError || !user) {
    return {
      valid: false,
      errorStatus: 401,
      errorResponse: { error: 'UNAUTHORIZED', message: 'Sesi login tidak valid atau sudah kedaluwarsa.' }
    };
  }

  // Strict check: User email must be admin@gmail.com
  const userEmail = (user.email || '').toLowerCase().trim();
  if (userEmail !== 'admin@gmail.com') {
    return {
      valid: false,
      errorStatus: 403,
      errorResponse: { error: 'ACCESS_DENIED', message: 'Hanya administrator resmi (admin@gmail.com) yang diizinkan.' }
    };
  }

  // Profile check: role must be admin and status aktif
  const { data: profile, error: profileErr } = await serviceClient
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile || profile.role !== 'admin' || profile.status !== 'aktif') {
    return {
      valid: false,
      errorStatus: 403,
      errorResponse: { error: 'ACCESS_DENIED', message: 'Profil administrator tidak valid atau belum aktif.' }
    };
  }

  return { valid: true, user };
}

// -------------------------------------------------------------
// SECURE ENDPOINT: List all teachers (Admin only)
// -------------------------------------------------------------
app.get('/api/admin/teachers', async (req, res): Promise<any> => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'DATABASE_UNCONFIGURED', message: 'Supabase credentials missing.' });
    }

    const authCheck = await verifyAdminRequester(req.headers.authorization);
    if (!authCheck.valid) {
      return res.status(authCheck.errorStatus || 403).json(authCheck.errorResponse);
    }

    const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: teachers, error } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('role', 'guru')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API_ADMIN_TEACHERS_ERROR]', error);
      return res.status(500).json({ error: 'FETCH_FAILED', message: error.message });
    }

    return res.status(200).json({
      success: true,
      teachers: teachers || []
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// -------------------------------------------------------------
// SECURE ENDPOINT: Create a Guru User account (Admin only)
// -------------------------------------------------------------
app.post('/api/admin/create-user', async (req, res): Promise<any> => {
  console.log('--- CREATE USER API REACHED ---');
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        error: 'DATABASE_UNCONFIGURED',
        message: 'Supabase credentials are not fully configured in environment variables.'
      });
    }

    // 1. Authenticate Requester strictly as Admin
    const authCheck = await verifyAdminRequester(req.headers.authorization);
    if (!authCheck.valid) {
      return res.status(authCheck.errorStatus || 403).json(authCheck.errorResponse);
    }

    const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 2. Validate and Parse Input Fields
    const { email, password, username, nama_lengkap, sekolah, mata_pelajaran, kelas, status } = req.body;

    if (!email || !password || !username || !nama_lengkap) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Email, Password, Username, dan Nama Lengkap wajib diisi.' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'INVALID_PASSWORD', message: 'Password minimal 6 karakter.' });
    }

    // 3. Ensure username and email are unique
    const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
    const sanitizedEmail = email.trim().toLowerCase();

    const { data: existingUser, error: existingUserErr } = await serviceClient
      .from('profiles')
      .select('id, username, email')
      .or(`username.eq.${sanitizedUsername},email.eq.${sanitizedEmail}`);

    if (existingUser && existingUser.length > 0) {
      const match = existingUser[0];
      if (match.email === sanitizedEmail) {
        return res.status(400).json({ error: 'EMAIL_ALREADY_EXISTS', message: 'Email sudah digunakan oleh guru lain.' });
      }
      return res.status(400).json({ error: 'USERNAME_ALREADY_EXISTS', message: 'Username sudah digunakan oleh guru lain.' });
    }

    // 4. Create User in Supabase Auth via Admin API
    const { data: authResult, error: createAuthError } = await serviceClient.auth.admin.createUser({
      email: sanitizedEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        nama_lengkap: nama_lengkap.trim(),
        username: sanitizedUsername
      }
    });

    if (createAuthError || !authResult.user) {
      console.error('[DEV_CREATE_USER_ERROR] Supabase Auth createUser failed:', createAuthError?.message);
      return res.status(400).json({
        error: createAuthError?.code || 'AUTH_CREATION_FAILED',
        message: createAuthError?.message || 'Gagal membuat user di Supabase Auth.'
      });
    }

    const newUserId = authResult.user.id;

    // 5. Create Profile Record - STRICTLY ROLE 'guru' ALWAYS
    const { error: insertProfileError } = await serviceClient
      .from('profiles')
      .insert({
        id: newUserId,
        username: sanitizedUsername,
        nama_lengkap: nama_lengkap.trim(),
        email: email.trim().toLowerCase(),
        sekolah: (sekolah || '').trim(),
        mata_pelajaran: (mata_pelajaran || '').trim(),
        kelas: (kelas || '').trim(),
        status: status === 'nonaktif' ? 'nonaktif' : 'aktif',
        role: 'guru' // STRICT MANDATE: ALWAYS 'guru'
      });

    if (insertProfileError) {
      console.error('[DEV_CREATE_USER_ERROR] Profile insert failed:', insertProfileError.message);
      await serviceClient.auth.admin.deleteUser(newUserId);
      return res.status(400).json({
        error: insertProfileError.code || 'PROFILE_CREATION_FAILED',
        message: insertProfileError.message || 'Gagal menyisipkan profil guru baru.'
      });
    }

    console.log('[DEV_CREATE_USER_SUCCESS] Teacher account and profile successfully created for ID:', newUserId);
    return res.status(201).json({
      success: true,
      user: {
        id: newUserId,
        email: email.trim().toLowerCase(),
        username: sanitizedUsername,
        nama_lengkap: nama_lengkap.trim(),
        role: 'guru',
        status: status === 'nonaktif' ? 'nonaktif' : 'aktif'
      }
    });

  } catch (err: any) {
    console.error('[DEV_CREATE_USER_EXCEPTION] Internal server error:', err?.message || err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Terjadi kesalahan internal server.' });
  }
});

// -------------------------------------------------------------
// SECURE ENDPOINT: Edit a Guru User profile (Admin only)
// -------------------------------------------------------------
app.post('/api/admin/edit-user', async (req, res): Promise<any> => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        error: 'DATABASE_UNCONFIGURED',
        message: 'Supabase credentials are not fully configured.'
      });
    }

    // 1. Authenticate Requester strictly as Admin
    const authCheck = await verifyAdminRequester(req.headers.authorization);
    if (!authCheck.valid) {
      return res.status(authCheck.errorStatus || 403).json(authCheck.errorResponse);
    }

    const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 2. Validate and Parse Input Fields
    const { userId, username, nama_lengkap, sekolah, mata_pelajaran, kelas, status } = req.body;

    if (!userId || !username || !nama_lengkap) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'User ID, Username, dan Nama Lengkap wajib diisi.' });
    }

    // Target cannot be admin account
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .maybeSingle();

    if (targetProfile && targetProfile.email === 'admin@gmail.com') {
      return res.status(400).json({ error: 'CANNOT_EDIT_ADMIN', message: 'Data akun administrator utama tidak dapat diubah di sini.' });
    }

    // 3. Ensure username uniqueness if changed
    const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
    const { data: existingUser } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('username', sanitizedUsername)
      .neq('id', userId)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'USERNAME_TAKEN', message: 'Username sudah digunakan oleh guru lain.' });
    }

    // 4. Update profiles record - STRICTLY KEEP ROLE AS 'guru'
    const { error: updateProfileError } = await serviceClient
      .from('profiles')
      .update({
        username: sanitizedUsername,
        nama_lengkap: nama_lengkap.trim(),
        sekolah: (sekolah || '').trim(),
        mata_pelajaran: (mata_pelajaran || '').trim(),
        kelas: (kelas || '').trim(),
        status: status === 'nonaktif' ? 'nonaktif' : 'aktif',
        role: 'guru', // NEVER PERMIT CHANGING ROLE TO ADMIN
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateProfileError) {
      return res.status(400).json({
        error: 'PROFILE_UPDATE_FAILED',
        message: updateProfileError.message || 'Gagal mengubah profil guru.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profil guru berhasil diubah.'
    });

  } catch (err: any) {
    console.error('Edit User API Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Terjadi kesalahan internal server.' });
  }
});

// -------------------------------------------------------------
// SECURE ENDPOINT: Delete a Guru User account (Admin only)
// -------------------------------------------------------------
app.delete('/api/admin/users/:userId', handleDeleteUser);
app.post('/api/admin/delete-user', handleDeleteUser);

async function handleDeleteUser(req: any, res: any): Promise<any> {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SUPABASE_ADMIN_NOT_CONFIGURED',
          message: 'Konfigurasi Supabase URL, Anon Key, atau Service Role Key belum lengkap di server.'
        }
      });
    }

    const authCheck = await verifyAdminRequester(req.headers.authorization);
    if (!authCheck.valid) {
      return res.status(authCheck.errorStatus || 403).json(authCheck.errorResponse);
    }

    const adminUser = authCheck.user;
    const adminClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const targetUserId = req.params.userId || req.body?.userId;
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'User ID target wajib disertakan.'
        }
      });
    }

    if (targetUserId === adminUser.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: 'Tidak dapat menghapus akun admin sendiri.'
        }
      });
    }

    // Check target user existence in Supabase Auth
    const { data: targetAuthUser, error: targetAuthErr } = await adminClient.auth.admin.getUserById(targetUserId);
    if (targetAuthErr || !targetAuthUser?.user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Akun guru tidak ditemukan di sistem.'
        }
      });
    }

    if (targetAuthUser.user.email?.toLowerCase() === 'admin@gmail.com') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PROTECTED_ADMIN',
          message: 'Akun administrator utama dilindungi dan tidak dapat dihapus.'
        }
      });
    }

    console.log('[DELETE USER DEBUG] admin user id:', adminUser.id, 'target user id:', targetUserId, 'target email:', targetAuthUser.user.email);

    console.log('[DELETE USER FLOW] Starting cascading deletion for user:', targetUserId);

    // 1. Delete likes created by the target user
    const { error: errLikes } = await adminClient
      .from('likes')
      .delete()
      .eq('user_id', targetUserId);
    if (errLikes) console.warn('[DELETE USER FLOW] Warning deleting user likes:', errLikes.message);

    // 2. Delete comments created by the target user
    const { error: errComments } = await adminClient
      .from('comments')
      .delete()
      .eq('author_id', targetUserId);
    if (errComments) console.warn('[DELETE USER FLOW] Warning deleting user comments:', errComments.message);

    // 3. Find posts created by the target user and delete their likes and comments
    const { data: userPosts, error: errFetchPosts } = await adminClient
      .from('posts')
      .select('id')
      .eq('author_id', targetUserId);

    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map(p => p.id);
      
      // Delete likes on these posts
      const { error: errLikesOnPosts } = await adminClient
        .from('likes')
        .delete()
        .in('post_id', postIds);
      if (errLikesOnPosts) console.warn('[DELETE USER FLOW] Warning deleting likes on user posts:', errLikesOnPosts.message);

      // Delete comments on these posts
      const { error: errCommentsOnPosts } = await adminClient
        .from('comments')
        .delete()
        .in('post_id', postIds);
      if (errCommentsOnPosts) console.warn('[DELETE USER FLOW] Warning deleting comments on user posts:', errCommentsOnPosts.message);

      // Delete the posts themselves
      const { error: errDeletePosts } = await adminClient
        .from('posts')
        .delete()
        .in('id', postIds);
      if (errDeletePosts) console.warn('[DELETE USER FLOW] Warning deleting user posts:', errDeletePosts.message);
    }

    // 4. Find all conversations involving this user
    const { data: userConvs, error: errFetchConvs } = await adminClient
      .from('conversations')
      .select('id')
      .or(`user1_id.eq.${targetUserId},user2_id.eq.${targetUserId}`);

    if (userConvs && userConvs.length > 0) {
      const convIds = userConvs.map(c => c.id);

      // Delete all messages inside those conversations first
      const { error: errDeleteMessagesInConvs } = await adminClient
        .from('messages')
        .delete()
        .in('conversation_id', convIds);
      if (errDeleteMessagesInConvs) console.warn('[DELETE USER FLOW] Warning deleting messages in user conversations:', errDeleteMessagesInConvs.message);

      // Delete those conversations
      const { error: errDeleteConvs } = await adminClient
        .from('conversations')
        .delete()
        .in('id', convIds);
      if (errDeleteConvs) console.warn('[DELETE USER FLOW] Warning deleting user conversations:', errDeleteConvs.message);
    }

    // 5. Delete any remaining messages sent by this user (just in case they exist outside the tracked conversations)
    const { error: errMessages } = await adminClient
      .from('messages')
      .delete()
      .eq('sender_id', targetUserId);
    if (errMessages) console.warn('[DELETE USER FLOW] Warning deleting user messages:', errMessages.message);

    // 6. Delete profile record
    const { error: deleteProfileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', targetUserId);

    if (deleteProfileError) {
      console.error('[DELETE USER FLOW] Error deleting profile row:', deleteProfileError.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_PROFILE_FAILED',
          message: deleteProfileError.message || 'Gagal menghapus profil dari database.'
        }
      });
    }

    // 7. Finally, delete the Auth User from Supabase Authentication
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (deleteAuthError) {
      console.error('[DELETE USER ERROR] Supabase admin delete failed:', deleteAuthError.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_USER_FAILED',
          message: deleteAuthError.message || 'Gagal menghapus user dari Supabase Authentication.'
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Akun guru berhasil dihapus.',
      deletedUserId: targetUserId,
      deletedEmail: targetAuthUser.user.email
    });

  } catch (err: any) {
    console.error('Delete User API Exception:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: err.message || 'Terjadi kesalahan internal server.'
      }
    });
  }
}

import {
  updateUserPresence,
  getUserPresence,
  getPosts,
  getPostById,
  createPost,
  deletePost,
  togglePostLike,
  hasUserLikedPost,
  getLikesForPost,
  getCommentsForPost,
  createComment,
  getOrCreateDirectConversation,
  getUserConversations,
  getConversationById,
  getMessagesForConversation,
  createMessage,
  deleteMessage,
  markConversationMessagesAsRead,
  getMessageById,
  getAttachmentById,
  getUnreadMessagesCount,
  getLastMessage,
  StoredAttachment
} from './server/community_store';

// Helper: Verify any active authenticated user (Admin or Guru with status === 'aktif')
async function verifyUserRequester(authHeader?: string): Promise<{ valid: boolean; user?: any; profile?: any; errorStatus?: number; errorResponse?: any }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      errorStatus: 401,
      errorResponse: { error: 'UNAUTHORIZED', message: 'Token otentikasi tidak ditemukan.' }
    };
  }

  const token = authHeader.split(' ')[1].trim();
  if (!token) {
    return {
      valid: false,
      errorStatus: 401,
      errorResponse: { error: 'UNAUTHORIZED', message: 'Token otentikasi kosong.' }
    };
  }

  const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
  if (userError || !user) {
    return {
      valid: false,
      errorStatus: 401,
      errorResponse: { error: 'UNAUTHORIZED', message: 'Sesi login tidak valid atau sudah kedaluwarsa.' }
    };
  }

  // Retrieve user profile
  let { data: profile, error: profileErr } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const userEmail = (user.email || '').toLowerCase().trim();
  const isOfficialAdmin = userEmail === 'admin@gmail.com';

  // If profile not yet created in DB, auto-create consistent record
  if (!profile) {
    const defaultUsername = (userEmail.split('@')[0] || `user_${user.id.substring(0, 5)}`).replace(/[^a-zA-Z0-9_]/g, '_');
    const newProf = {
      id: user.id,
      username: isOfficialAdmin ? 'admin' : defaultUsername,
      nama_lengkap: isOfficialAdmin ? 'Administrator EMKAIN' : (user.user_metadata?.nama_lengkap || defaultUsername),
      email: userEmail,
      sekolah: isOfficialAdmin ? 'EMKAIN Pusat' : '',
      mata_pelajaran: isOfficialAdmin ? 'Management' : '',
      kelas: '',
      avatar_url: isOfficialAdmin ? '🛡️' : '👩‍🏫',
      role: isOfficialAdmin ? 'admin' : 'guru',
      status: 'aktif'
    };

    const { data: inserted, error: insErr } = await serviceClient.from('profiles').insert(newProf).select().maybeSingle();
    if (!insErr && inserted) {
      profile = inserted;
    } else {
      profile = newProf;
    }
  }

  // Account Status Check (nonaktif)
  if (profile.status === 'nonaktif') {
    return {
      valid: false,
      errorStatus: 403,
      errorResponse: { error: 'ACCOUNT_DISABLED', message: 'Akun Anda telah dinonaktifkan oleh administrator.' }
    };
  }

  // Strict role enforcement
  if (isOfficialAdmin) {
    profile.role = 'admin';
  } else {
    profile.role = 'guru';
  }

  // Signal online presence automatically upon active request
  updateUserPresence(user.id, true);

  return { valid: true, user, profile };
}

// -------------------------------------------------------------
// COMMUNITY DIRECTORY & PRESENCE ENDPOINTS
// -------------------------------------------------------------

// Heartbeat presence ping
app.post('/api/community/heartbeat', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }
    updateUserPresence(auth.user.id, true);
    return res.json({ success: true, is_online: true, timestamp: Date.now() });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Set presence to offline on logout
app.post('/api/community/presence-offline', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (auth.valid && auth.user?.id) {
      updateUserPresence(auth.user.id, false);
    }
    return res.json({ success: true, is_online: false });
  } catch (err: any) {
    return res.json({ success: true, is_online: false });
  }
});

// Get all active community members with online presence and last seen
app.get('/api/community/members', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: rawProfiles, error } = await serviceClient
      .from('profiles')
      .select('id, username, nama_lengkap, sekolah, mata_pelajaran, kelas, avatar_url, role, status, email, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[COMMUNITY_MEMBERS_ERROR]', error);
      return res.status(500).json({ error: 'FETCH_FAILED', message: error.message });
    }

    const members = (rawProfiles || []).map(p => {
      const email = (p.email || '').toLowerCase().trim();
      const isOfficialAdmin = email === 'admin@gmail.com';
      const role = isOfficialAdmin ? 'admin' : 'guru';

      const presence = getUserPresence(p.id);
      // Requester is currently active
      const isSelf = p.id === auth.user.id;
      const isOnline = isSelf ? true : presence.is_online;
      const lastSeen = isSelf ? new Date().toISOString() : presence.last_seen_at;

      return {
        id: p.id,
        username: p.username || (email ? email.split('@')[0] : `user_${p.id.substring(0, 5)}`),
        nama_lengkap: p.nama_lengkap || 'Anggota EMKAIN',
        avatar_url: p.avatar_url || (role === 'admin' ? '🛡️' : '👩‍🏫'),
        role,
        status: p.status || 'aktif',
        sekolah: p.sekolah || (role === 'admin' ? 'EMKAIN Pusat' : 'SMK Multi Karya'),
        mata_pelajaran: p.mata_pelajaran || '',
        kelas: p.kelas || '',
        is_online: isOnline,
        last_seen_at: lastSeen,
        created_at: p.created_at
      };
    });

    return res.json({ success: true, members });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Single member profile lookup
app.get('/api/community/members/:userId', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const targetUserId = req.params.userId;
    const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: p, error } = await serviceClient
      .from('profiles')
      .select('id, username, nama_lengkap, sekolah, mata_pelajaran, kelas, avatar_url, role, status, email, created_at')
      .eq('id', targetUserId)
      .maybeSingle();

    if (error || !p) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Profil anggota tidak ditemukan.' });
    }

    const email = (p.email || '').toLowerCase().trim();
    const isOfficialAdmin = email === 'admin@gmail.com';
    const role = isOfficialAdmin ? 'admin' : 'guru';

    const presence = getUserPresence(p.id);
    const isSelf = p.id === auth.user.id;

    return res.json({
      success: true,
      profile: {
        id: p.id,
        username: p.username || (email ? email.split('@')[0] : `user_${p.id.substring(0, 5)}`),
        nama_lengkap: p.nama_lengkap || 'Anggota EMKAIN',
        avatar_url: p.avatar_url || (role === 'admin' ? '🛡️' : '👩‍🏫'),
        role,
        status: p.status || 'aktif',
        sekolah: p.sekolah || (role === 'admin' ? 'EMKAIN Pusat' : 'SMK Multi Karya'),
        mata_pelajaran: p.mata_pelajaran || '',
        kelas: p.kelas || '',
        is_online: isSelf ? true : presence.is_online,
        last_seen_at: isSelf ? new Date().toISOString() : presence.last_seen_at,
        created_at: p.created_at
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// -------------------------------------------------------------
// FORUM COMMUNITY POSTS & INTERACTION ENDPOINTS
// -------------------------------------------------------------

// Helper to attach profiles map
async function getProfilesMap(serviceClient: any, userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('id, username, nama_lengkap, avatar_url, role, email, sekolah, mata_pelajaran')
    .in('id', uniqueIds);

  const map = new Map<string, any>();
  (profiles || []).forEach((p: any) => {
    const email = (p.email || '').toLowerCase().trim();
    const isOfficialAdmin = email === 'admin@gmail.com';
    map.set(p.id, {
      id: p.id,
      username: p.username || (email ? email.split('@')[0] : `user_${p.id.substring(0, 5)}`),
      nama_lengkap: p.nama_lengkap || 'Guru EMKAIN',
      avatar_url: p.avatar_url || (isOfficialAdmin ? '🛡️' : '👩‍🏫'),
      role: isOfficialAdmin ? 'admin' : 'guru',
      sekolah: p.sekolah,
      mata_pelajaran: p.mata_pelajaran
    });
  });
  return map;
}

// Get forum feed
app.get('/api/community/posts', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const posts = getPosts(auth.user.id);
    const authorIds = posts.map(p => p.author_id);

    const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const profilesMap = await getProfilesMap(serviceClient, authorIds);

    const enrichedPosts = posts.map(p => {
      const authorProf = profilesMap.get(p.author_id) || {
        nama_lengkap: p.author_id === auth.user.id ? auth.profile.nama_lengkap : 'Guru EMKAIN',
        username: p.author_id === auth.user.id ? auth.profile.username : 'guru',
        avatar_url: p.author_id === auth.user.id ? auth.profile.avatar_url : '👩‍🏫',
        role: p.author_id === auth.user.id ? auth.profile.role : 'guru'
      };

      const presence = getUserPresence(p.author_id);
      const isAuthorSelf = p.author_id === auth.user.id;
      const isOnline = isAuthorSelf ? true : presence.is_online;
      const lastSeen = isAuthorSelf ? new Date().toISOString() : presence.last_seen_at;

      const likes = getLikesForPost(p.id);
      const comments = getCommentsForPost(p.id);
      const userHasLiked = hasUserLikedPost(p.id, auth.user.id);

      return {
        id: p.id,
        author_id: p.author_id,
        title: p.title,
        content: p.content,
        visibility: p.visibility,
        created_at: p.created_at,
        updated_at: p.updated_at,
        likes_count: likes.length,
        comments_count: comments.length,
        user_has_liked: userHasLiked,
        author_profile: {
          ...authorProf,
          is_online: isOnline,
          last_seen_at: lastSeen
        }
      };
    });

    return res.json({ success: true, posts: enrichedPosts });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Create new post
app.post('/api/community/posts', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const { title, content, visibility } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Judul topik wajib diisi.' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Pesan / isi diskusi wajib diisi.' });
    }

    const created = createPost({
      author_id: auth.user.id,
      title: title.trim(),
      content: content.trim(),
      visibility: visibility === 'private' ? 'private' : 'public'
    });

    const fullPost = {
      ...created,
      likes_count: 0,
      comments_count: 0,
      user_has_liked: false,
      author_profile: {
        nama_lengkap: auth.profile.nama_lengkap,
        username: auth.profile.username,
        avatar_url: auth.profile.avatar_url || '👩‍🏫',
        role: auth.profile.role,
        sekolah: auth.profile.sekolah,
        is_online: true,
        last_seen_at: new Date().toISOString()
      }
    };

    return res.status(201).json({ success: true, post: fullPost });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Toggle Like on a post
app.post('/api/community/posts/:id/like', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const postId = req.params.id;
    const post = getPostById(postId);
    if (!post) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Postingan tidak ditemukan.' });
    }

    const result = togglePostLike(postId, auth.user.id);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Get comments for a post
app.get('/api/community/posts/:id/comments', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const postId = req.params.id;
    const comments = getCommentsForPost(postId);
    const authorIds = comments.map(c => c.author_id);

    const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const profilesMap = await getProfilesMap(serviceClient, authorIds);

    const enriched = comments.map(c => ({
      ...c,
      author_profile: profilesMap.get(c.author_id) || {
        nama_lengkap: c.author_id === auth.user.id ? auth.profile.nama_lengkap : 'Guru EMKAIN',
        username: c.author_id === auth.user.id ? auth.profile.username : 'guru',
        avatar_url: c.author_id === auth.user.id ? auth.profile.avatar_url : '👩‍🏫',
        role: c.author_id === auth.user.id ? auth.profile.role : 'guru'
      }
    }));

    return res.json({ success: true, comments: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Add comment to a post
app.post('/api/community/posts/:id/comments', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const postId = req.params.id;
    const post = getPostById(postId);
    if (!post) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Postingan tidak ditemukan.' });
    }

    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Komentar tidak boleh kosong.' });
    }

    const newComment = createComment(postId, auth.user.id, content);
    const enriched = {
      ...newComment,
      author_profile: {
        nama_lengkap: auth.profile.nama_lengkap,
        username: auth.profile.username,
        avatar_url: auth.profile.avatar_url || '👩‍🏫',
        role: auth.profile.role,
        sekolah: auth.profile.sekolah
      }
    };

    return res.status(201).json({ success: true, comment: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// -------------------------------------------------------------
// LOUNGE & PERSONAL DIRECT CHAT ENDPOINTS
// -------------------------------------------------------------

// =========================================================================
// CHAT ATTACHMENTS & UPLOADS CONFIGURATION (Private Storage Engine)
// =========================================================================
const CHAT_UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads', 'chat-attachments');
if (!fs.existsSync(CHAT_UPLOADS_DIR)) {
  fs.mkdirSync(CHAT_UPLOADS_DIR, { recursive: true });
}

// Max file size constant (50 MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Categorize and validate file by extension and MIME
function categorizeAndValidateFile(originalName: string, mimeType: string): {
  valid: boolean;
  category?: 'doc' | 'pdf' | 'ppt' | 'excel' | 'image' | 'video' | 'audio' | 'other';
  error?: string;
} {
  const ext = path.extname(originalName).toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  // Documents - Word (.doc, .docx)
  if (['.doc', '.docx'].includes(ext) || mime.includes('word') || mime.includes('wordprocessingml')) {
    return { valid: true, category: 'doc' };
  }
  // Documents - PDF (.pdf)
  if (ext === '.pdf' || mime.includes('pdf')) {
    return { valid: true, category: 'pdf' };
  }
  // Documents - PowerPoint (.ppt, .pptx)
  if (['.ppt', '.pptx'].includes(ext) || mime.includes('powerpoint') || mime.includes('presentationml')) {
    return { valid: true, category: 'ppt' };
  }
  // Documents - Excel / Spreadsheet / CSV (.xls, .xlsx, .csv)
  if (['.xls', '.xlsx', '.csv'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheetml') || mime === 'text/csv' || mime === 'application/csv') {
    return { valid: true, category: 'excel' };
  }
  // Images (.jpg, .jpeg, .png, .webp, .gif)
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) || mime.startsWith('image/')) {
    return { valid: true, category: 'image' };
  }
  // Videos (.mp4, .webm, .mov)
  if (['.mp4', '.webm', '.mov'].includes(ext) || mime.startsWith('video/')) {
    return { valid: true, category: 'video' };
  }
  // Audio (.mp3, .wav, .m4a, .ogg, .webm)
  if (['.mp3', '.wav', '.m4a', '.ogg', '.webm'].includes(ext) || mime.startsWith('audio/')) {
    return { valid: true, category: 'audio' };
  }

  // Unsupported formats
  return {
    valid: false,
    error: 'Format file tidak didukung. File yang didukung: Word (.doc/.docx), PDF (.pdf), PowerPoint (.ppt/.pptx), Excel (.xls/.xlsx/.csv), Gambar (.jpg/.png/.webp/.gif), Video (.mp4/.webm/.mov), dan Audio (.mp3/.wav/.m4a/.ogg).'
  };
}

// Multer Storage Configuration
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const convId = (req.body.conversationId || req.query.conversationId || 'general').toString().replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetDir = path.join(CHAT_UPLOADS_DIR, convId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const cleanOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniquePrefix = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${uniquePrefix}_${cleanOriginal}`);
  }
});

const uploadChatMiddleware = multer({
  storage: multerStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const validation = categorizeAndValidateFile(file.originalname, file.mimetype);
    if (!validation.valid) {
      return cb(new Error(validation.error || 'Format file tidak didukung.'));
    }
    cb(null, true);
  }
});

// In-memory signed tokens for temporary secure file download / preview
const signedTokensMap = new Map<string, { attachmentId: string; userId: string; expiresAt: number }>();

function generateSignedToken(attachmentId: string, userId: string, ttlMs: number = 3600000): string {
  const token = `st_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  signedTokensMap.set(token, {
    attachmentId,
    userId,
    expiresAt: Date.now() + ttlMs
  });
  return token;
}

function verifySignedToken(token: string, attachmentId?: string): { valid: boolean; userId?: string } {
  const record = signedTokensMap.get(token);
  if (!record) return { valid: false };
  if (Date.now() > record.expiresAt) {
    signedTokensMap.delete(token);
    return { valid: false };
  }
  if (attachmentId && record.attachmentId !== attachmentId) {
    return { valid: false };
  }
  return { valid: true, userId: record.userId };
}

// 1. Upload files endpoint (Supports single or multiple attachments)
app.post('/api/chat/upload', async (req, res): Promise<any> => {
  uploadChatMiddleware.array('files', 10)(req, res, async (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'FILE_TOO_LARGE',
          message: 'File terlalu besar. Ukuran maksimum adalah 50 MB.'
        });
      }
      return res.status(400).json({
        error: 'UPLOAD_ERROR',
        message: err.message || 'Gagal mengunggah file. Silakan coba lagi.'
      });
    }

    try {
      const auth = await verifyUserRequester(req.headers.authorization);
      if (!auth.valid) {
        // Clean up uploaded files if unauthorized
        if (req.files && Array.isArray(req.files)) {
          req.files.forEach((f: any) => {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
          });
        }
        return res.status(auth.errorStatus || 401).json(auth.errorResponse);
      }

      const conversationId = req.body.conversationId;
      if (!conversationId) {
        return res.status(400).json({ error: 'INVALID_INPUT', message: 'Conversation ID wajib disertakan.' });
      }

      const conv = getConversationById(conversationId);
      if (!conv || !conv.participants.includes(auth.user.id)) {
        return res.status(403).json({ error: 'ACCESS_DENIED', message: 'Anda bukan peserta percakapan ini.' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'NO_FILES', message: 'Tidak ada file yang diunggah.' });
      }

      const attachments: StoredAttachment[] = files.map((file) => {
        const validation = categorizeAndValidateFile(file.originalname, file.mimetype);
        const attachmentId = `att_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        return {
          id: attachmentId,
          name: file.originalname,
          size: file.size,
          mime_type: file.mimetype || 'application/octet-stream',
          file_category: validation.category || 'other',
          storage_path: file.path,
          created_at: new Date().toISOString()
        };
      });

      // Generate signed download / view tokens for the uploader
      const enrichedAttachments = attachments.map(att => {
        const signedToken = generateSignedToken(att.id, auth.user.id);
        return {
          id: att.id,
          name: att.name,
          size: att.size,
          mime_type: att.mime_type,
          file_category: att.file_category,
          storage_path: att.storage_path,
          url: `/api/chat/files/${att.id}?st=${signedToken}`,
          download_url: `/api/chat/files/download/${att.id}?st=${signedToken}`
        };
      });

      return res.status(200).json({
        success: true,
        message: 'File berhasil diunggah.',
        attachments: enrichedAttachments
      });
    } catch (uploadException: any) {
      console.error('Chat upload exception:', uploadException);
      return res.status(500).json({ error: 'SERVER_ERROR', message: 'Terjadi kesalahan saat memproses file.' });
    }
  });
});

// 2. Generate signed token for file viewing/download
app.post('/api/chat/files/:attachmentId/signed-url', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const attachmentId = req.params.attachmentId;
    const item = getAttachmentById(attachmentId);
    if (!item) {
      return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'File tidak ditemukan di sistem.' });
    }

    // STRICT PRIVACY: Only conversation participants can request signed URL
    if (!item.conversation.participants.includes(auth.user.id)) {
      return res.status(403).json({ error: 'ACCESS_DENIED', message: 'Anda tidak memiliki izin untuk mengakses file ini.' });
    }

    const signedToken = generateSignedToken(attachmentId, auth.user.id);
    const viewUrl = `/api/chat/files/${attachmentId}?st=${signedToken}`;
    const downloadUrl = `/api/chat/files/download/${attachmentId}?st=${signedToken}`;

    return res.json({
      success: true,
      token: signedToken,
      url: viewUrl,
      download_url: downloadUrl
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 3. View / Stream File (Private & Secure)
app.get('/api/chat/files/:attachmentId', async (req, res): Promise<any> => {
  try {
    const attachmentId = req.params.attachmentId;
    const signedToken = req.query.st as string;
    const authHeader = req.headers.authorization;

    let authorizedUserId: string | null = null;

    // Check signed token first
    if (signedToken) {
      const verified = verifySignedToken(signedToken, attachmentId);
      if (verified.valid && verified.userId) {
        authorizedUserId = verified.userId;
      }
    }

    // Otherwise verify Bearer token
    if (!authorizedUserId && authHeader) {
      const auth = await verifyUserRequester(authHeader);
      if (auth.valid && auth.user) {
        authorizedUserId = auth.user.id;
      }
    }

    if (!authorizedUserId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Otentikasi diperlukan untuk mengakses file.' });
    }

    const item = getAttachmentById(attachmentId);
    if (!item) {
      return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'File tidak ditemukan.' });
    }

    // STRICT PRIVACY RULE: Only conversation members can access!
    if (!item.conversation.participants.includes(authorizedUserId)) {
      return res.status(403).json({ error: 'ACCESS_DENIED', message: 'Anda tidak memiliki izin untuk mengakses file ini.' });
    }

    if (!fs.existsSync(item.attachment.storage_path)) {
      return res.status(404).json({ error: 'FILE_MISSING', message: 'File fisik tidak ditemukan pada server.' });
    }

    res.setHeader('Content-Type', item.attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(item.attachment.name)}"`);
    
    const fileStream = fs.createReadStream(item.attachment.storage_path);
    fileStream.pipe(res);
  } catch (err: any) {
    console.error('File stream error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Gagal membuka file. Silakan coba lagi.' });
  }
});

// 4. Download File with forced attachment disposition
app.get('/api/chat/files/download/:attachmentId', async (req, res): Promise<any> => {
  try {
    const attachmentId = req.params.attachmentId;
    const signedToken = req.query.st as string;
    const authHeader = req.headers.authorization;

    let authorizedUserId: string | null = null;

    if (signedToken) {
      const verified = verifySignedToken(signedToken, attachmentId);
      if (verified.valid && verified.userId) {
        authorizedUserId = verified.userId;
      }
    }

    if (!authorizedUserId && authHeader) {
      const auth = await verifyUserRequester(authHeader);
      if (auth.valid && auth.user) {
        authorizedUserId = auth.user.id;
      }
    }

    if (!authorizedUserId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Otentikasi diperlukan untuk mendownload file.' });
    }

    const item = getAttachmentById(attachmentId);
    if (!item) {
      return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'File tidak ditemukan.' });
    }

    if (!item.conversation.participants.includes(authorizedUserId)) {
      return res.status(403).json({ error: 'ACCESS_DENIED', message: 'Anda tidak memiliki izin untuk mendownload file ini.' });
    }

    if (!fs.existsSync(item.attachment.storage_path)) {
      return res.status(404).json({ error: 'FILE_MISSING', message: 'File fisik tidak ditemukan pada server.' });
    }

    res.setHeader('Content-Type', item.attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(item.attachment.name)}"`);

    const fileStream = fs.createReadStream(item.attachment.storage_path);
    fileStream.pipe(res);
  } catch (err: any) {
    console.error('File download error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Gagal mendownload file. Silakan coba lagi.' });
  }
});

// 5. Link Preview Parser Endpoint
app.post('/api/chat/link-preview', async (req, res): Promise<any> => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
      return res.status(400).json({
        error: 'INVALID_URL',
        message: 'Link tidak valid. Masukkan URL yang diawali http:// atau https://.'
      });
    }

    const trimmedUrl = url.trim();
    let domain = '';
    try {
      const parsed = new URL(trimmedUrl);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch (e) {
      domain = 'link';
    }

    let title = domain.charAt(0).toUpperCase() + domain.slice(1);
    let description = trimmedUrl;

    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      title = 'YouTube Video';
      description = 'Tonton video di YouTube';
    } else if (domain.includes('docs.google.com')) {
      title = 'Google Dokumen';
      description = 'Buka dokumen kolaborasi Google';
    } else if (domain.includes('drive.google.com')) {
      title = 'Google Drive File';
      description = 'Buka berkas di Google Drive';
    } else if (domain.includes('github.com')) {
      title = 'GitHub Repository';
      description = 'Buka proyek di GitHub';
    } else if (domain.includes('canva.com')) {
      title = 'Canva Design';
      description = 'Buka template atau desain Canva';
    } else if (domain.includes('kemdikbud.go.id')) {
      title = 'Kementerian Pendidikan & Kebudayaan';
      description = 'Portal Resmi Kemdikbud';
    }

    return res.json({
      success: true,
      url: trimmedUrl,
      title,
      description,
      domain
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// List all conversations for the authenticated user
app.get('/api/chat/conversations', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const convs = getUserConversations(auth.user.id);
    const otherUserIds = convs.map(c => c.participants.find(p => p !== auth.user.id) || auth.user.id);

    const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const profilesMap = await getProfilesMap(serviceClient, otherUserIds);

    const enriched = convs.map(c => {
      const otherId = c.participants.find(p => p !== auth.user.id) || auth.user.id;
      const otherProf = profilesMap.get(otherId);
      const presence = getUserPresence(otherId);

      const lastMsg = getLastMessage(c.id);

      // Formatted preview snippet based on message type
      let previewText = '';
      if (lastMsg) {
        if (lastMsg.message) {
          previewText = lastMsg.message;
        } else if (lastMsg.message_type === 'image') {
          previewText = '📷 Mengirim gambar';
        } else if (lastMsg.message_type === 'video') {
          previewText = '🎥 Mengirim video';
        } else if (lastMsg.message_type === 'audio') {
          previewText = '🎵 Mengirim audio';
        } else if (lastMsg.message_type === 'link') {
          previewText = `🔗 ${lastMsg.link_url || 'Mengirim tautan'}`;
        } else if (lastMsg.attachments && lastMsg.attachments.length > 0) {
          previewText = `📄 ${lastMsg.attachments[0].name}`;
        } else {
          previewText = 'Mengirim pesan';
        }
      }

      // Calculate unread count for requester
      const unreadCount = getMessagesForConversation(c.id, auth.user.id)
        .filter(m => m.sender_id !== auth.user.id && !m.read_by.includes(auth.user.id)).length;

      return {
        id: c.id,
        participants: c.participants,
        created_at: c.created_at,
        updated_at: c.updated_at,
        other_user: otherProf ? {
          ...otherProf,
          is_online: presence.is_online,
          last_seen_at: presence.last_seen_at
        } : null,
        last_message: lastMsg ? {
          message: previewText,
          sender_id: lastMsg.sender_id,
          created_at: lastMsg.created_at,
          message_type: lastMsg.message_type
        } : null,
        unread_count: unreadCount
      };
    });

    return res.json({ success: true, conversations: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Start or get direct conversation with another member
app.post('/api/chat/conversations/direct', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const { targetUserId } = req.body;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Target user ID wajib disertakan.' });
    }

    if (targetUserId === auth.user.id) {
      return res.status(400).json({ error: 'INVALID_TARGET', message: 'Tidak dapat memulai percakapan pribadi dengan diri sendiri.' });
    }

    const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: targetProfile, error } = await serviceClient
      .from('profiles')
      .select('id, username, nama_lengkap, avatar_url, role, status, email, sekolah, mata_pelajaran')
      .eq('id', targetUserId)
      .maybeSingle();

    if (error || !targetProfile) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Pengguna tujuan tidak ditemukan.' });
    }

    const conv = getOrCreateDirectConversation(auth.user.id, targetUserId);
    const presence = getUserPresence(targetUserId);

    const email = (targetProfile.email || '').toLowerCase().trim();
    const role = email === 'admin@gmail.com' ? 'admin' : 'guru';

    const safeTargetProfile = {
      id: targetProfile.id,
      username: targetProfile.username || email.split('@')[0],
      nama_lengkap: targetProfile.nama_lengkap || 'Anggota EMKAIN',
      avatar_url: targetProfile.avatar_url || (role === 'admin' ? '🛡️' : '👩‍🏫'),
      role,
      status: targetProfile.status || 'aktif',
      sekolah: targetProfile.sekolah || '',
      mata_pelajaran: targetProfile.mata_pelajaran || '',
      is_online: presence.is_online,
      last_seen_at: presence.last_seen_at
    };

    return res.json({
      success: true,
      conversation: {
        id: conv.id,
        participants: conv.participants,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        other_user: safeTargetProfile,
        last_message: getLastMessage(conv.id),
        unread_count: 0
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Get messages for a specific conversation (Strictly private to participants!)
app.get('/api/chat/conversations/:id/messages', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const convId = req.params.id;
    const conv = getConversationById(convId);
    if (!conv) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Percakapan tidak ditemukan.' });
    }

    // STRICT PRIVACY RULE: Only conversation members can access!
    if (!conv.participants.includes(auth.user.id)) {
      return res.status(403).json({ error: 'ACCESS_DENIED', message: 'Anda tidak memiliki akses ke percakapan pribadi ini.' });
    }

    markConversationMessagesAsRead(convId, auth.user.id);
    const messages = getMessagesForConversation(convId, auth.user.id);
    const senderIds = messages.map(m => m.sender_id);

    const serviceClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const profilesMap = await getProfilesMap(serviceClient, senderIds);

    const enriched = messages.map(m => {
      if (m.message_type === 'retracted') {
        return {
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          message: '',
          message_type: 'retracted',
          attachment_url: null,
          attachment_name: null,
          attachment_size: null,
          attachment_mime_type: null,
          link_url: null,
          link_title: null,
          link_description: null,
          attachments: [],
          created_at: m.created_at,
          read_by: m.read_by,
          sender_profile: profilesMap.get(m.sender_id) || {
            nama_lengkap: m.sender_id === auth.user.id ? auth.profile.nama_lengkap : 'Guru EMKAIN',
            username: m.sender_id === auth.user.id ? auth.profile.username : 'guru',
            avatar_url: m.sender_id === auth.user.id ? auth.profile.avatar_url : '👩‍🏫',
            role: m.sender_id === auth.user.id ? auth.profile.role : 'guru'
          }
        };
      }

      // Enrich attachments with signed access tokens for the viewer
      const enrichedAtts = (m.attachments || []).map(att => {
        const signedToken = generateSignedToken(att.id, auth.user.id);
        return {
          id: att.id,
          name: att.name,
          size: att.size,
          mime_type: att.mime_type,
          file_category: att.file_category,
          url: `/api/chat/files/${att.id}?st=${signedToken}`,
          download_url: `/api/chat/files/download/${att.id}?st=${signedToken}`
        };
      });

      return {
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        message: m.message,
        message_type: m.message_type || 'text',
        attachment_url: m.attachment_url,
        attachment_name: m.attachment_name,
        attachment_size: m.attachment_size,
        attachment_mime_type: m.attachment_mime_type,
        link_url: m.link_url,
        link_title: m.link_title,
        link_description: m.link_description,
        attachments: enrichedAtts,
        created_at: m.created_at,
        read_by: m.read_by,
        sender_profile: profilesMap.get(m.sender_id) || {
          nama_lengkap: m.sender_id === auth.user.id ? auth.profile.nama_lengkap : 'Guru EMKAIN',
          username: m.sender_id === auth.user.id ? auth.profile.username : 'guru',
          avatar_url: m.sender_id === auth.user.id ? auth.profile.avatar_url : '👩‍🏫',
          role: m.sender_id === auth.user.id ? auth.profile.role : 'guru'
        }
      };
    });

    return res.json({ success: true, messages: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Send message to conversation (Supports text, files, images, videos, audios, links)
app.post('/api/chat/conversations/:id/messages', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const convId = req.params.id;
    const conv = getConversationById(convId);
    if (!conv) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Percakapan tidak ditemukan.' });
    }

    // STRICT PRIVACY RULE: Only conversation members can send messages!
    if (!conv.participants.includes(auth.user.id)) {
      return res.status(403).json({ error: 'ACCESS_DENIED', message: 'Anda bukan peserta percakapan ini.' });
    }

    const {
      message,
      message_type,
      attachments,
      link_url,
      link_title,
      link_description
    } = req.body;

    const messageText = typeof message === 'string' ? message.trim() : '';
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    const hasLink = !!(link_url && typeof link_url === 'string' && link_url.trim());

    if (!messageText && !hasAttachments && !hasLink) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Pesan, berkas, atau tautan wajib diisi.' });
    }

    // Determine message type
    let finalType: 'text' | 'file' | 'image' | 'video' | 'audio' | 'link' = 'text';
    if (message_type) {
      finalType = message_type;
    } else if (hasAttachments) {
      const firstCat = attachments[0].file_category;
      if (firstCat === 'image') finalType = 'image';
      else if (firstCat === 'video') finalType = 'video';
      else if (firstCat === 'audio') finalType = 'audio';
      else finalType = 'file';
    } else if (hasLink) {
      finalType = 'link';
    }

    const newMsg = createMessage({
      conversationId: convId,
      senderId: auth.user.id,
      messageText,
      messageType: finalType,
      attachments: attachments || [],
      linkUrl: link_url?.trim(),
      linkTitle: link_title?.trim(),
      linkDescription: link_description?.trim()
    });

    if (!newMsg) {
      return res.status(500).json({ error: 'SEND_FAILED', message: 'Gagal mengirim pesan. Silakan coba lagi.' });
    }

    // Enrich attachments for response
    const enrichedAtts = (newMsg.attachments || []).map(att => {
      const signedToken = generateSignedToken(att.id, auth.user.id);
      return {
        id: att.id,
        name: att.name,
        size: att.size,
        mime_type: att.mime_type,
        file_category: att.file_category,
        url: `/api/chat/files/${att.id}?st=${signedToken}`,
        download_url: `/api/chat/files/download/${att.id}?st=${signedToken}`
      };
    });

    const enriched = {
      ...newMsg,
      attachments: enrichedAtts,
      sender_profile: {
        nama_lengkap: auth.profile.nama_lengkap,
        username: auth.profile.username,
        avatar_url: auth.profile.avatar_url || '👩‍🏫',
        role: auth.profile.role
      }
    };

    return res.status(201).json({ success: true, message: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Delete message (Sender only)
app.delete('/api/chat/messages/:id', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const messageId = req.params.id;
    const result = deleteMessage(messageId, auth.user.id);

    if (!result.success) {
      return res.status(400).json({ error: 'DELETE_FAILED', message: result.error || 'Gagal menghapus pesan.' });
    }

    return res.json({ success: true, message: 'Pesan berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Get total unread messages count for badge notification
app.get('/api/chat/unread-count', async (req, res): Promise<any> => {
  try {
    const auth = await verifyUserRequester(req.headers.authorization);
    if (!auth.valid) {
      return res.status(auth.errorStatus || 401).json(auth.errorResponse);
    }

    const unreadCount = getUnreadMessagesCount(auth.user.id);
    return res.json({ success: true, unread_count: unreadCount });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Development diagnostic endpoint for delete
app.get('/api/admin/debug/delete-user', async (req, res): Promise<any> => {
  return res.json({
    authenticated: true,
    supabaseUrlConfigured: !!getSupabaseUrl(),
    supabaseAnonKeyConfigured: !!getSupabaseAnonKey(),
    supabaseServiceRoleConfigured: !!getSupabaseServiceRoleKey()
  });
});

// -------------------------------------------------------------
// VITE AND STATIC FILE SERVING
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html for all non-matched routes (Single Page Application fallback)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EMKAIN GURU full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
