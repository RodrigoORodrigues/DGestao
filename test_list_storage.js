import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data: files, error } = await supabase.storage.from('arquivos_extratos').list('', { limit: 10000 });
    if (error) {
        console.error("Error listing storage files:", error);
        return;
    }
    
    console.log(`Total files in storage bucket: ${files.length}`);
    
    // Filter for files with "ASSIM" in their name
    const assimFiles = files.filter(f => f.name.toUpperCase().includes("ASSIM"));
    console.log(`ASSIM files count in root storage: ${assimFiles.length}`);
    assimFiles.forEach((f, idx) => {
        console.log(`- [${idx+1}] Name: ${f.name}, Size: ${f.metadata?.size || f.id || 'N/A'}`);
    });

    // Check if there are folders or subdirectories (by listing recursively if possible, or looking at directories in files)
    const folders = files.filter(f => !f.metadata);
    console.log(`Folders in root:`, folders.map(f => f.name));

    // Let's check inside "arquivos_extratos" subfolders if any
    for (const folder of folders) {
        const { data: subFiles, error: subError } = await supabase.storage.from('arquivos_extratos').list(folder.name, { limit: 10000 });
        if (!subError && subFiles) {
            const subAssim = subFiles.filter(f => f.name.toUpperCase().includes("ASSIM"));
            if (subAssim.length > 0) {
                console.log(`\nFound ${subAssim.length} ASSIM files in folder '${folder.name}':`);
                subAssim.forEach(f => console.log(`  - ${f.name}`));
            }
        }
    }
}

run();
