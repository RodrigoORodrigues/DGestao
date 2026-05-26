import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    console.log("Verificando tabelas...");
    const tables = ['users', 'clientes', 'vendas', 'savedReports', 'reports', 'user_preferences', 'print_presets', 'system_config', 'lgpd_terms_versions', 'lgpd_acceptances'];
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
