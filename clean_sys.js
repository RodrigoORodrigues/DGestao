import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanSys() {
    const { data: sysConfigs } = await supabase.from('savedReports').select('*').eq('nome', '___LOCAL_SYS_CONFIG___');
    if (sysConfigs && sysConfigs.length > 0) {
        let sysConfigRow = sysConfigs[0];
        let dados = Array.isArray(sysConfigRow.dados) ? sysConfigRow.dados[0] : sysConfigRow.dados;
        if (dados && Array.isArray(dados.empresas)) {
            dados.empresas = dados.empresas.filter(e => e.nome !== 'Operadora');
            const updatedDados = Array.isArray(sysConfigRow.dados) ? [dados] : dados;
            await supabase.from('savedReports').update({ dados: updatedDados }).eq('id', sysConfigRow.id);
            console.log("Updated sys config!");
        }
    }
}
cleanSys();
