import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data: rep851, error: err1 } = await supabase.from('reports').select('*').eq('id', 851);
    const { data: rep852, error: err2 } = await supabase.from('reports').select('*').eq('id', 852);
    
    if (err1 || err2) {
        console.error(err1, err2);
        return;
    }

    console.log("Report ID 851:", JSON.stringify(rep851, null, 2));
    console.log("Report ID 852:", JSON.stringify(rep852, null, 2));
}

run();
