/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const rawKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('[SUPABASE CONFIG]', {
  hasUrl: Boolean(rawUrl),
  hasKey: Boolean(rawKey),
});

export const isSupabaseConfigured = !!(rawUrl && rawKey);

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

const baseSupabaseUrl = rawUrl || 'https://placeholder-project.supabase.co';
const supabaseUrl = sanitizeSupabaseUrl(baseSupabaseUrl);
const supabaseAnonKey = rawKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.key';

// Print only the hostname for development debugging
try {
  const parsed = new URL(supabaseUrl);
  console.log(`Supabase project: ${parsed.host}`);
} catch (e) {
  console.log(`Supabase project: ${supabaseUrl}`);
}

// Friendly warnings if config is missing
if (!isSupabaseConfigured) {
  console.warn(
    'EMKAIN GURU: Supabase environment variables are missing! ' +
    'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your settings/environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
