import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { count: countV, error: errV } = await supabase.from('vendas').select('*', { count: 'exact', head: true });
  const { count: countR, error: errR } = await supabase.from('savedReports').select('*', { count: 'exact', head: true });
  console.log('Vendas count:', countV);
  console.log('SavedReports count:', countR);
}

main();
