import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: reports, error: err2 } = await supabase.from('savedReports').select('id, empresa').limit(5);
  console.log('Reports:', JSON.stringify(reports, null, 2));
}

main();
