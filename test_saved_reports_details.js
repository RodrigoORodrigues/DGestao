import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data: savedReports, error } = await supabase.from('savedReports').select('*');
    if (error) {
        console.error(error);
        return;
    }

    console.log("Searching for June / 262 / 272 reports...");
    savedReports.forEach(sr => {
        const rows = Array.isArray(sr.dados) ? sr.dados : [];
        const nfs = Array.from(new Set(rows.map(r => String(r.notaFiscal || '')).filter(Boolean)));
        const nameUpper = String(sr.nome || '').toUpperCase();
        const periodUpper = String(sr.periodo || '').toUpperCase();
        
        const hasJune = nameUpper.includes("JUN") || periodUpper.includes("JUN") || periodUpper.includes("06/2026");
        const hasNf = nfs.includes("262") || nfs.includes("272");
        
        if (hasJune || hasNf) {
            console.log(`Match: ID ${sr.id} | Name: "${sr.nome}" | Period: "${sr.periodo}" | NFs in rows:`, nfs);
        }
    });
}

run();
