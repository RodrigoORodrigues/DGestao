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

    console.log(`Total savedReports in database: ${savedReports.length}`);
    
    let count = 0;
    savedReports.forEach(sr => {
        const rows = Array.isArray(sr.dados) ? sr.dados : [];
        const isAssim = rows.some(r => {
            const op = String(r.codigoOperadora || r.codOperadora || r.operadora || '').toUpperCase();
            return op.includes("ASSIM");
        });
        if (isAssim) {
            count++;
            const nfs = Array.from(new Set(rows.map(r => String(r.notaFiscal || '')).filter(Boolean)));
            console.log(`[${count}] Saved Report ID: ${sr.id} | Name: "${sr.nome}" | Period: "${sr.periodo}" | Rows: ${rows.length} | NFs:`, nfs);
        }
    });
}

run();
