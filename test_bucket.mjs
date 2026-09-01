import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL.replace('/rest/v1/', ''), process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.storage.listBuckets();
  console.log('Buckets:', data?.map(b => b.name) || [], error);
  
  if (!data?.find(b => b.name === 'materi')) {
    const { data: createData, error: createError } = await supabase.storage.createBucket('materi', { public: true });
    console.log('Create materi:', createData, createError);
  }
  
  if (!data?.find(b => b.name === 'rpm')) {
    const { data: createData, error: createError } = await supabase.storage.createBucket('rpm', { public: true });
    console.log('Create rpm:', createData, createError);
  }
  
  if (!data?.find(b => b.name === 'ujian')) {
    const { data: createData, error: createError } = await supabase.storage.createBucket('ujian', { public: true });
    console.log('Create ujian:', createData, createError);
  }
}
test();
