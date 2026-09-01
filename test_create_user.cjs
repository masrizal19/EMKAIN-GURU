const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL).trim();
const parsed = new URL(url);
const cleanUrl = `${parsed.protocol}//${parsed.host}`;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY).trim();

const supabase = createClient(cleanUrl, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function test() {
  const email = 'test_new_guru123@example.com';
  const username = 'test_guru123';
  
  const { data: authResult, error: createAuthError } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      nama_lengkap: 'Test Guru',
      username: username
    }
  });
  
  if (createAuthError) {
    console.error('Create Auth Error:', createAuthError);
    return;
  }
  
  console.log('Created auth user:', authResult.user.id);
  
  const { error: insertError } = await supabase.from('profiles').insert({
    id: authResult.user.id,
    username: username,
    nama_lengkap: 'Test Guru',
    email: email,
    sekolah: 'Test School',
    mata_pelajaran: 'Math',
    kelas: 'X',
    status: 'aktif',
    role: 'guru'
  });
  
  if (insertError) {
    console.error('Insert Profile Error:', insertError);
    await supabase.auth.admin.deleteUser(authResult.user.id);
  } else {
    console.log('Profile created successfully!');
    await supabase.auth.admin.deleteUser(authResult.user.id); // cleanup
    console.log('User cleaned up.');
  }
}
test();
