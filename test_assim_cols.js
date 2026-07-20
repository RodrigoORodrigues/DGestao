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
        const name = String(r.nome || '').toUpperCase();
        const operadora = String(r.operadora || '').toUpperCase();
        return name.includes("ASSIM") || operadora.includes("ASSIM");
    });

    console.log(`Total ASSIM reports found: ${assimReports.length}`);
    if (assimReports.length > 0) {
        assimReports.slice(0, 3).forEach((r, idx) => {
            console.log(`\nReport #${idx+1}:`);
            console.log(`ID: ${r.id}`);
            console.log(`Nome: ${r.nome}`);
            console.log(`Operadora: ${r.operadora}`);
            console.log(`Data Criação: ${r.dataCriacao}`);
            console.log(`Período: ${r.periodo}`);
            console.log(`Empresa: ${r.empresa}`);
            console.log(`Dados Type: ${typeof r.dados}`);
            if (r.dados) {
                const dadosArr = Array.isArray(r.dados) ? r.dados : (r.dados.vendas || r.dados.dados || []);
                console.log(`Dados is Array: ${Array.isArray(r.dados)} (Length: ${dadosArr.length})`);
                if (dadosArr.length > 0) {
                    console.log("Sample row keys:", Object.keys(dadosArr[0]));
                    console.log("Sample row:", JSON.stringify(dadosArr[0], null, 2));
                }
            }
        });
    }
}

run();
