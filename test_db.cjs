const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL).trim();
const parsed = new URL(url);
const cleanUrl = `${parsed.protocol}//${parsed.host}`;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY).trim();

const supabase = createClient(cleanUrl, key);

async function test() {
  const { data, error } = await supabase.from('materi').select('*').limit(1);
  console.log('materi error:', error ? error.message : 'no error');
  
  const { data: d2, error: e2 } = await supabase.from('rpm').select('*').limit(1);
  console.log('rpm error:', e2 ? e2.message : 'no error');
}
test();
