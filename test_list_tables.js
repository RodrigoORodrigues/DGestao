import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    // We can list tables by querying postgres or trying to select from common tables
    const tables = ['vendas', 'reports', 'savedReports', 'clientes', 'empresas', 'logs', 'meta_historico', 'metas'];
    for (const t of tables) {
        try {
            const { data, error, count } = await supabase.from(t).select('*', { count: 'exact', head: true });
            if (error) {
                console.log(`Table '${t}': Error (${error.message})`);
            } else {
                console.log(`Table '${t}': Exists (Count: ${count})`);
            }
        } catch (e) {
            console.log(`Table '${t}': Exception (${e.message})`);
        }
    }
}

run();
