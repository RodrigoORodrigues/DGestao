import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
  console.log("Starting migration...");
  const { data: savedReports, error } = await supabase.from('savedReports').select('*');
  
  if (error) {
    console.error("Error fetching reports:", error);
    return;
  }
  
  let updatedCount = 0;
  for (const report of savedReports) {
    if (!report.dados || !Array.isArray(report.dados)) continue;
    
    let modified = false;
    const novosDados = report.dados.map(record => {
      // Look for HAPVIDA records regardless of case, though normally it's uppercase.
      const op = String(record.codigoOperadora || record.codOperadora || "").toUpperCase();
      if (op === "HAPVIDA" && record.vitalicio !== "Sim") {
        modified = true;
        return { ...record, vitalicio: "Sim" };
      }
      return record;
    });
    
    if (modified) {
      const { error: updateError } = await supabase.from('savedReports').update({ dados: novosDados }).eq('id', report.id);
      if (updateError) {
        console.error(`Error updating report ${report.id}:`, updateError);
      } else {
        console.log(`Updated report: ${report.id} / ${report.nome}`);
        updatedCount++;
      }
    }
  }
  
  console.log(`Migration completed! Updated ${updatedCount} reports.`);
}

migrate();
