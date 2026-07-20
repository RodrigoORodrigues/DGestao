import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listRecursive(dir = '') {
    const { data: files, error } = await supabase.storage.from('arquivos_extratos').list(dir, { limit: 10000 });
    if (error) {
        console.error(`Error listing '${dir}':`, error);
        return [];
    }
    
    let allFiles = [];
    for (const file of files) {
        const fullPath = dir ? `${dir}/${file.name}` : file.name;
        // Supabase storage returns files without metadata or with id as placeholder for folders
        const isFolder = !file.metadata && file.name !== '.emptyFolderPlaceholder';
        if (isFolder) {
            const sub = await listRecursive(fullPath);
            allFiles = allFiles.concat(sub);
        } else {
            allFiles.push({
                name: file.name,
                path: fullPath,
                metadata: file.metadata,
                id: file.id
            });
        }
    }
    return allFiles;
}

async function run() {
    console.log("Listing files recursively from 'arquivos_extratos'...");
    const all = await listRecursive();
    console.log(`Total files found recursively: ${all.length}`);
    
    const assimFiles = all.filter(f => f.path.toUpperCase().includes("ASSIM"));
    console.log(`\nFound ${assimFiles.length} ASSIM files recursively:`);
    assimFiles.forEach((f, idx) => {
        console.log(`[${idx+1}] Path: ${f.path}`);
    });
}

run();
