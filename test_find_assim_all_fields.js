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
    
    // We want to find any report where the stringified 'dados' contains "ASSIM"
    const results = [];
    savedReports.forEach(r => {
        const dadosStr = JSON.stringify(r.dados || {}).toUpperCase();
        const nomeStr = String(r.nome || '').toUpperCase();
        const periodoStr = String(r.periodo || '').toUpperCase();
        
        const isAssim = dadosStr.includes("ASSIM") || nomeStr.includes("ASSIM") || periodoStr.includes("ASSIM");
        if (isAssim) {
            results.push(r);
        }
    });

    console.log(`Total reports containing ASSIM in any form: ${results.length}`);
    results.forEach((r, idx) => {
        const rows = Array.isArray(r.dados) ? r.dados : [];
        console.log(`[${idx+1}] ID: ${r.id}, Nome: "${r.nome}", Periodo: "${r.periodo}", Rows: ${rows.length}, Empresa: "${r.empresa}"`);
    });
}

run();
