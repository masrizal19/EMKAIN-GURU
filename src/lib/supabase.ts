/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('[SUPABASE CONFIG]', {
  hasUrl: Boolean(supabaseUrl),
  hasKey: Boolean(supabasePublishableKey),
});

export const isSupabaseConfigured = !!(supabaseUrl && supabasePublishableKey);

function sanitizeSupabaseUrl(url: string | undefined): string {
  if (!url) return '';
  let cleaned = url.trim();
  // Strip trailing slashes first
  cleaned = cleaned.replace(/\/+$/, '');
  // Remove trailing path segments like /rest/v1, /rest, /auth/v1, /auth, /v1, /api
  cleaned = cleaned.replace(/\/(rest|auth|api|v1)+(\/(rest|auth|api|v1)+)*$/, '');
  // Strip trailing slashes again
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

const rawUrl = supabaseUrl || 'https://placeholder-project.supabase.co';
const sanitizedUrl = sanitizeSupabaseUrl(rawUrl);
const activeKey = supabasePublishableKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.key';

// Print only the hostname for development debugging
if (isSupabaseConfigured) {
  try {
    const parsed = new URL(sanitizedUrl);
    console.log(`Supabase project: ${parsed.host}`);
  } catch (e) {
    console.log(`Supabase project: ${sanitizedUrl}`);
  }
} else {
  console.warn(
    'EMKAIN GURU: Supabase environment variables are missing! ' +
    'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your settings/environment.'
  );
}

export const supabase = createClient(sanitizedUrl, activeKey);
