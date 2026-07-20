import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data: files, error } = await supabase.storage.from("arquivos_extratos").list('', { limit: 10000 });
    if (error) {
        console.error("Error listing files:", error);
        return;
    }

    console.log(`Total files in root bucket: ${files.length}`);
    const nonJpg = files.filter(f => !f.name.toLowerCase().endsWith('.jpg'));
    console.log(`Non-JPG files in root bucket: ${nonJpg.length}`);
    nonJpg.forEach((f, idx) => {
        console.log(`- [${idx+1}] "${f.name}" (${f.metadata?.size || 0} bytes)`);
    });

    // Also let's list under "migrados_jpg"
    const { data: migFiles, error: err2 } = await supabase.storage.from("arquivos_extratos").list('migrados_jpg', { limit: 10000 });
    if (err2) {
        console.error("Error listing migrados_jpg:", err2);
        return;
    }
    console.log(`\nTotal files under 'migrados_jpg': ${migFiles.length}`);
    const assimMigFiles = migFiles.filter(f => f.name.toUpperCase().includes("ASSIM") || f.name.toUpperCase().includes("DEZENA") || f.name.toUpperCase().includes("PARCELA"));
    console.log(`ASSIM-like files under 'migrados_jpg': ${assimMigFiles.length}`);
    assimMigFiles.forEach((f, idx) => {
        console.log(`- [${idx+1}] "${f.name}" (${f.metadata?.size || 0} bytes)`);
    });
}

run();
