import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseServiceRoleKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^["']|["']$/g, '');

const serviceClient = createClient(rawUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function listFunctions() {
  console.log('=== LISTING RPC FUNCTIONS ===');
  // We can query the routines or check if a standard exec_sql/run_sql RPC is available
  try {
    const { data, error } = await serviceClient.rpc('get_my_claims');
    console.log('get_my_claims:', { data, error });
  } catch (e) {
    console.log('get_my_claims exception:', e);
  }

  try {
    const { data, error } = await serviceClient.rpc('exec_sql', { query: 'SELECT 1' });
    console.log('exec_sql:', { data, error });
  } catch (e) {
    console.log('exec_sql exception:', e);
  }
}

listFunctions();
