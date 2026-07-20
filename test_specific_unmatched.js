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

    // Print all savedReports names and their NF values in their rows
    savedReports.forEach(sr => {
        const rows = Array.isArray(sr.dados) ? sr.dados : [];
        const nfs = Array.from(new Set(rows.map(r => String(r.notaFiscal || '')).filter(Boolean)));
        const nameUpper = String(sr.nome || '').toUpperCase();
        if (nameUpper.includes("ASSIM") || nameUpper.includes("RELATÓRIO")) {
            // Check if contains any ASSIM records
            const hasAssim = rows.some(r => String(r.codigoOperadora || r.codOperadora || '').toUpperCase().includes("ASSIM"));
            if (hasAssim) {
                console.log(`Saved Report: ID ${sr.id} | Name: "${sr.nome}" | Period: "${sr.periodo}" | NFs in rows:`, nfs);
            }
        }
    });
}

run();
