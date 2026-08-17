/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('[SUPABASE CONFIG]', {
  hasUrl: Boolean(supabaseUrl),
  hasKey: Boolean(supabasePublishableKey),
});

export const isSupabaseConfigured = !!(supabaseUrl && supabasePublishableKey);

// Print only the hostname for development debugging
if (isSupabaseConfigured) {
  try {
    const parsed = new URL(supabaseUrl);
    console.log(`Supabase project: ${parsed.host}`);
  } catch (e) {
    console.log(`Supabase project: ${supabaseUrl}`);
  }
} else {
  console.warn(
    'EMKAIN GURU: Supabase environment variables are missing! ' +
    'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your settings/environment.'
  );
}

// Fallbacks for type-safety so createClient doesn't crash on undefined at compilation time
const activeUrl = supabaseUrl || 'https://placeholder-project.supabase.co';
const activeKey = supabasePublishableKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.key';

export const supabase = createClient(activeUrl, activeKey);
