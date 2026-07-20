import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data: savedReports, error } = await supabase.from('savedReports').select('*');
    if (error) {
        console.error("Error fetching savedReports:", error);
        return;
    }
    
    console.log(`Total savedReports fetched: ${savedReports.length}`);
    if (savedReports.length > 0) {
        console.log("Record keys:", Object.keys(savedReports[0]));
        console.log("Sample record (excluding dados to keep output small):");
        const { dados, ...rest } = savedReports[0];
        console.log(JSON.stringify(rest, null, 2));
    }

    // Let's print distinct values of some keys to see what we have:
    const distinctKeys = {};
    savedReports.forEach(r => {
        Object.keys(r).forEach(k => {
            if (k !== 'dados') {
                distinctKeys[k] = distinctKeys[k] || new Set();
                distinctKeys[k].add(r[k]);
            }
        });
    });

    for (const [k, s] of Object.entries(distinctKeys)) {
        console.log(`Distinct values for '${k}' (count: ${s.size}):`, Array.from(s).slice(0, 10));
    }
}

run();
