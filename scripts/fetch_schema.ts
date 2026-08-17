import dotenv from 'dotenv';

dotenv.config();

const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
// Clean to get the base rest/v1 URL
let cleanedUrl = rawUrl.trim();
if (!cleanedUrl.endsWith('/')) {
  cleanedUrl = `${cleanedUrl}/`;
}

const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^["']|["']$/g, '');

async function fetchSchema() {
  console.log('=== FETCHING POSTGREST SCHEMA ===');
  console.log('URL:', cleanedUrl);
  try {
    const res = await fetch(cleanedUrl, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    if (!res.ok) {
      console.log('HTTP Error:', res.status, res.statusText);
      return;
    }
    const data: any = await res.json();
    console.log('Paths available in OpenAPI:');
    const paths = Object.keys(data.paths || {});
    paths.sort().forEach(p => console.log(`- ${p}`));
  } catch (e) {
    console.error('Exception fetching schema:', e);
  }
}

fetchSchema();
