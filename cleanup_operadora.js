import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanEverything() {
    console.log("Cleaning lingering records with 'Operadora'");
    await supabase.from('vendas').delete().eq('empresa', 'Operadora');
    await supabase.from('vendas').delete().ilike('loja', '%OPERADORA%');
    await supabase.from('clientes').delete().eq('empresa', 'Operadora');
    await supabase.from('reports').delete().eq('empresa', 'Operadora');
    await supabase.from('savedReports').delete().eq('empresa', 'Operadora');
    
    console.log("Cleanup done.");
}
cleanEverything();
