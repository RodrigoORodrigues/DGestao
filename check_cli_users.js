import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { data: users } = await supabase.from('users').select('*');
    const { data: clientes } = await supabase.from('clientes').select('*').eq('empresa', 'Operadora');
    const { data: vendasL } = await supabase.from('vendas').select('*').eq('loja', 'OPERADORA');
    const { data: vendasL2 } = await supabase.from('vendas').select('*').ilike('loja', '%OPERADORA%');
    const { data: vendasA } = await supabase.from('vendas').select('*').eq('assessoria', 'Operadora');
    const { data: vendas } = await supabase.from('vendas').select('*').eq('empresa', 'Operadora');

    console.log("Users with Operadora:", users?.filter(u => u.empresa && u.empresa.toUpperCase() === 'OPERADORA'));
    console.log("Clientes with Operadora:", clientes?.length);
    console.log("Vendas L:", vendasL?.length, "Vendas L2:", vendasL2?.length, "Vendas A:", vendasA?.length, "Vendas E:", vendas?.length);
}
check();
