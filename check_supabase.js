import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    console.log("Checking Supabase tables...");
    
    // Check savedReports
    const { data: savedReports, error: savedError } = await supabase.from('savedReports').select('*');
    if (savedError) console.error("Error savedReports:", savedError);
    else console.log(`Found ${savedReports.length} savedReports. First few:`, savedReports.slice(0, 3).map(r => ({id: r.id, nome: r.nome, empresa: r.empresa})));

    // Check Vendas
    const { data: vendas, error: vendasError } = await supabase.from('vendas').select('id', { count: 'exact' });
    if (vendasError) console.error("Error vendas:", vendasError);
    else console.log(`Found ${vendas.length} vendas.`);
}

checkData();
