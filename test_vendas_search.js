import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data: v262, error: err1 } = await supabase.from('vendas').select('*').eq('notaFiscal', '262');
    const { data: v272, error: err2 } = await supabase.from('vendas').select('*').eq('notaFiscal', '272');
    
    if (err1 || err2) {
        console.error(err1, err2);
        return;
    }

    console.log(`Vendas with NF 262: ${v262?.length || 0}`);
    if (v262?.length) console.log(JSON.stringify(v262[0], null, 2));

    console.log(`Vendas with NF 272: ${v272?.length || 0}`);
    if (v272?.length) console.log(JSON.stringify(v272[0], null, 2));
}

run();
