import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim().replace(/^["']|["']$/g, '');
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    let cleaned = trimmed.replace(/\/+$/, '');
    cleaned = cleaned.replace(/\/(auth|rest|api|v1).*$/, '');
    return cleaned;
  }
}

const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
const supabaseServiceRoleKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^["']|["']$/g, '');

const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTables() {
  const tables = [
    'profiles',
    'forum_posts',
    'posts',
    'forum_comments',
    'comments',
    'forum_post_likes',
    'likes',
    'conversations',
    'conversation_members',
    'messages',
    'direct_messages',
    'user_presence'
  ];

  console.log('=== CHECKING SUPABASE TABLES ===');
  for (const t of tables) {
    const { data, error } = await serviceClient.from(t).select('*').limit(1);
    if (error) {
      console.log(`[TABLE: ${t}] Error / Not found: ${error.message} (${error.code})`);
    } else {
      console.log(`[TABLE: ${t}] EXISTS! Sample:`, data);
    }
  }
}

checkTables();
