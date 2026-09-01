const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL).trim();
const parsed = new URL(url);
const cleanUrl = `${parsed.protocol}//${parsed.host}`;

const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY).trim();

const supabase = createClient(cleanUrl, key);

async function test() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles data:', data);
  if (error) console.error('Error:', error);
}
test();
