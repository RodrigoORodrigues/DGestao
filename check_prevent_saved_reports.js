import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Checking savedReports...");
    const { data: savedReports, error } = await supabase
        .from('savedReports')
        .select('*');
        
    if (error) {
        console.error("Error:", error);
        return;
    }
    
    const preventReports = savedReports.filter(r => {
        const dadosStr = JSON.stringify(r.dados || {}).toUpperCase();
        return dadosStr.includes("PREVENT") || (r.nome && r.nome.toUpperCase().includes("PREVENT"));
    });
    
    console.log(`Found ${preventReports.length} PREVENT records in savedReports.`);
    preventReports.forEach(r => {
        console.log(`ID: ${r.id}, Name: ${r.nome}, Period: ${r.periodo}, Empresa: ${r.empresa}`);
        console.log(`  - Number of data rows: ${Array.isArray(r.dados) ? r.dados.length : 'not array'}`);
    });
}

run();
