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
    
    console.log(`Total savedReports in table: ${savedReports.length}`);
    
    // Group by 'empresa'
    const byEmpresa = {};
    savedReports.forEach(r => {
        const emp = r.empresa || 'null/undefined';
        byEmpresa[emp] = (byEmpresa[emp] || 0) + 1;
    });
    console.log("savedReports by 'empresa':", byEmpresa);

    const preventSR = savedReports.filter(r => r.empresa && r.empresa.toUpperCase().includes("PREVENT"));
    console.log(`\nFound ${preventSR.length} Prevent savedReports:`);
    preventSR.forEach(r => {
        console.log(`ID: ${r.id}, Name: ${r.nome}, Period: ${r.periodo}, Empresa: ${r.empresa}, Has dados: ${!!r.dados}, Dados length: ${Array.isArray(r.dados) ? r.dados.length : typeof r.dados}`);
    });
}

run();
