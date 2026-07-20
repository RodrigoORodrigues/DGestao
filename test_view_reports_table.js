import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data: reports, error } = await supabase.from('reports').select('*');
    if (error) {
        console.error("Error fetching reports:", error);
        return;
    }
    
    console.log(`Total records in 'reports' table: ${reports.length}`);
    
    // Find ASSIM files in reports
    const assimReports = reports.filter(r => {
        const name = String(r.fileName || r.filePath || '').toUpperCase();
        const partner = String(r.parceiro || '').toUpperCase();
        return name.includes("ASSIM") || partner.includes("ASSIM");
    });

    console.log(`Total ASSIM reports in 'reports' table: ${assimReports.length}`);
    assimReports.forEach((r, idx) => {
        console.log(`[${idx+1}] ID: ${r.id}, Name: "${r.fileName}", Path: "${r.filePath}", Parcela: "${r.parcela}", Periodo: "${r.periodo}"`);
    });
}

run();
