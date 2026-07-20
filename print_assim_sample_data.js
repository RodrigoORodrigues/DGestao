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
    
    // Find ASSIM-related reports
    const assimReports = savedReports.filter(r => {
        const dadosStr = JSON.stringify(r.dados || {}).toUpperCase();
        return dadosStr.includes("ASSIM") || String(r.nome || '').toUpperCase().includes("ASSIM");
    });

    console.log(`Found ${assimReports.length} ASSIM reports.`);
    if (assimReports.length > 0) {
        const rep = assimReports[0];
        console.log(`\nReport: ${rep.nome} | Period: ${rep.periodo}`);
        console.log(`First row:`, JSON.stringify(rep.dados[0], null, 2));
        console.log(`All keys in first row:`, Object.keys(rep.dados[0]));
        
        // Print unique keys across all rows of this report
        const allKeys = new Set();
        rep.dados.forEach(row => {
            Object.keys(row).forEach(k => allKeys.add(k));
        });
        console.log("Unique keys across all rows:", Array.from(allKeys));
        
        // Let's print values of each column in first 3 rows
        rep.dados.slice(0, 3).forEach((row, idx) => {
            console.log(`Row #${idx+1}:`);
            Object.entries(row).forEach(([k, v]) => {
                console.log(`  ${k}: ${v} (${typeof v})`);
            });
        });
    }
}

run();
