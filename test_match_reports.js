import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data: dbReports, error: errDb } = await supabase.from('reports').select('*');
    const { data: savedReports, error: errSaved } = await supabase.from('savedReports').select('*');
    
    if (errDb || errSaved) {
        console.error("Error fetching tables", errDb, errSaved);
        return;
    }

    const assimDbReports = dbReports.filter(r => {
        const name = String(r.fileName || r.filePath || '').toUpperCase();
        const partner = String(r.parceiro || '').toUpperCase();
        return name.includes("ASSIM") || partner.includes("ASSIM");
    });

    console.log(`ASSIM reports in 'reports' table: ${assimDbReports.length}`);
    
    // Find ASSIM-related in savedReports
    const assimSavedReports = savedReports.filter(r => {
        const dadosStr = JSON.stringify(r.dados || {}).toUpperCase();
        return dadosStr.includes("ASSIM") || String(r.nome || '').toUpperCase().includes("ASSIM");
    });
    console.log(`ASSIM reports in 'savedReports' table: ${assimSavedReports.length}`);

    // Let's try to match each assimDbReport to an assimSavedReport
    // Match based on:
    // 1. NF (notaFiscal) in the fileName (e.g. "NOTA 32" -> nf "32") and in the savedReport dados (where rows have "notaFiscal": "32")
    // 2. Period/Dezena and Month matching
    const matches = [];
    const unmatched = [];

    assimDbReports.forEach(dbRep => {
        const fileName = dbRep.fileName || '';
        // Extract NF number from name like "NOTA 32", "NOTA 193", "NOTA 40", "NOTA 121"
        const nfMatch = fileName.match(/NOTA\s*(\d+)/i);
        const nf = nfMatch ? nfMatch[1] : null;

        // Is it Odonto/Dental?
        const isDental = fileName.toUpperCase().includes("DENTAL") || fileName.toUpperCase().includes("ODONTO");

        // Try to find matching saved report
        let bestMatch = null;
        if (nf) {
            bestMatch = assimSavedReports.find(sr => {
                // Check if any row in sr.dados has this NF
                const srRows = Array.isArray(sr.dados) ? sr.dados : [];
                const hasNf = srRows.some(row => String(row.notaFiscal) === String(nf));
                
                // Match dental status as well
                const srIsDental = String(sr.nome || '').toUpperCase().includes("DENTAL");
                if (isDental) {
                    return hasNf && srIsDental;
                } else {
                    return hasNf && !srIsDental;
                }
            });
            
            // If still no match, match by NF only
            if (!bestMatch) {
                bestMatch = assimSavedReports.find(sr => {
                    const srRows = Array.isArray(sr.dados) ? sr.dados : [];
                    return srRows.some(row => String(row.notaFiscal) === String(nf));
                });
            }
        }

        if (bestMatch) {
            matches.push({ dbRep, savedRep: bestMatch, nf, isDental });
        } else {
            unmatched.push({ dbRep, nf, isDental });
        }
    });

    console.log(`\nSuccessfully matched: ${matches.length} / ${assimDbReports.length}`);
    matches.forEach((m, idx) => {
        console.log(`- Match #${idx+1}: DB ID: ${m.dbRep.id} ("${m.dbRep.fileName}") <--> Saved ID: ${m.savedRep.id} ("${m.savedRep.nome}" | Period: "${m.savedRep.periodo}")`);
    });

    console.log(`\nUnmatched: ${unmatched.length}`);
    unmatched.forEach((u, idx) => {
        console.log(`- Unmatched #${idx+1}: DB ID: ${u.dbRep.id} ("${u.dbRep.fileName}") | NF: ${u.nf}, IsDental: ${u.isDental}`);
    });
}

run();
