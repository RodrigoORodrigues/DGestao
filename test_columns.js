import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    console.log("Verificando tabelas...");
    const tables = ['users', 'clientes', 'vendas', 'savedReports', 'reports', 'print_presets', 'lgpd_terms_versions', 'lgpd_acceptances', 'empresas', 'arquivos_extratos'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ Erro na tabela ${table}:`, error.message);
        } else {
            console.log(`✅ Tabela ${table} lida com sucesso.`);
            if (data.length > 0) {
                 console.log(`   Colunas: ${Object.keys(data[0]).join(', ')}`);
            }
        }
    }
}
test();
