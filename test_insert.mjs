import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL.replace('/rest/v1/', ''), process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('materi_files').insert([{
    user_id: 'test', judul: 'test', mata_pelajaran: 'm', kelas: 'k', jenis_file: 'pdf', file_name: 'test.pdf', file_path: 'path', file_size: 1
  }]);
  console.log('Insert:', error || 'success');
}
test();
