import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deleteEmpresaOperadora() {
    console.log("Starting cleanup of Empresa 'Operadora' and its data...");

    // 1. Delete from reports
    const { data: repData, error: repError } = await supabase.from('reports').delete().eq('empresa', 'Operadora');
    console.log("Deleted from reports:", repError || 'Success');

    // 2. Delete from savedReports (excluding the LOCAL_SYS_CONFIG)
    const { data: savedRepData, error: savedRepError } = await supabase.from('savedReports').delete().eq('empresa', 'Operadora');
    console.log("Deleted from savedReports:", savedRepError || 'Success');

    // 3. Delete from vendas (loja = OPERADORA upper, or assessoria = Operadora)
    const { data: vendasLData, error: vendasLError } = await supabase.from('vendas').delete().eq('loja', 'OPERADORA');
    const { data: vendasAData, error: vendasAError } = await supabase.from('vendas').delete().eq('assessoria', 'Operadora');
    console.log("Deleted from vendas:", vendasLError || 'Success', vendasAError || 'Success');

    // 4. Filter out 'Operadora' from ___LOCAL_SYS_CONFIG___
    const { data: sysConfigs, error: sysError } = await supabase.from('savedReports').select('*').eq('nome', '___LOCAL_SYS_CONFIG___');
    if (sysConfigs && sysConfigs.length > 0) {
        let sysConfigRow = sysConfigs[0];
        let dados = Array.isArray(sysConfigRow.dados) ? sysConfigRow.dados[0] : sysConfigRow.dados;
        if (dados && Array.isArray(dados.empresas)) {
            const originalLength = dados.empresas.length;
            dados.empresas = dados.empresas.filter(e => e.nome !== 'Operadora');
            console.log(`Filtered sys config empresas: ${originalLength} -> ${dados.empresas.length}`);
            
            const updatedDados = Array.isArray(sysConfigRow.dados) ? [dados] : dados;
            const { error: updateError } = await supabase.from('savedReports').update({ dados: updatedDados }).eq('id', sysConfigRow.id);
            console.log("Updated sys config:", updateError || 'Success');
        }
    }
    
    // 5. Delete from 'empresas' table in case it was created
    const { data: empData, error: empError } = await supabase.from('empresas').delete().eq('nome', 'Operadora');
    console.log("Deleted from empresas table:", empError || 'Success');

    console.log("Cleanup finished.");
}
deleteEmpresaOperadora();
