import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkConfig() {
    const { data: savedReports, error: savedError } = await supabase.from('savedReports').select('*').eq('nome', '___LOCAL_SYS_CONFIG___');
    if (savedReports && savedReports.length > 0) {
        console.log("SYS CONFIG:", JSON.stringify(savedReports[0].dados, null, 2));
    } else {
        console.log("Not found.");
    }
}
checkConfig();
