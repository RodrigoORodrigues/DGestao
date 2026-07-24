import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://leoboaezhcyproeiceql.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_c0UMabWK8t6_ZsHdn-1BTA_6Bqsxwmk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CONCURRENCY = 20;

async function checkFile(r) {
  const pathTarget = r.filePath || r.fileName;
  if (!pathTarget) {
    return { id: r.id, success: false, reason: 'No path in DB' };
  }
  try {
    const { data, error: dlErr } = await supabase.storage
      .from('arquivos_extratos')
      .download(pathTarget, { range: { start: 0, end: 1 } });
    
    if (dlErr) {
      return { id: r.id, success: false, reason: dlErr.message, path: pathTarget };
    }
    return { id: r.id, success: true };
  } catch (err) {
    return { id: r.id, success: false, reason: err.message, path: pathTarget };
  }
}

async function main() {
  console.log("Fetching all reports from DB...");
  const { data: reports, error } = await supabase.from('reports').select('*');
  if (error) {
    console.error('Error fetching reports:', error);
    return;
  }
  
  const total = reports.length;
  console.log('Total reports in DB:', total);
  
  const failed = [];
  let successCount = 0;
  
  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = reports.slice(i, i + CONCURRENCY);
    const promises = batch.map(r => checkFile(r).then(res => {
      if (res.success) {
        successCount++;
      } else {
        failed.push(res);
      }
    }));
    await Promise.all(promises);
    if ((i + CONCURRENCY) % 100 === 0 || i + CONCURRENCY >= total) {
      console.log(`Checked ${Math.min(i + CONCURRENCY, total)} / ${total} files...`);
    }
  }
  
  console.log(`\n=== CHECK COMPLETED ===`);
  console.log(`Succeeded: ${successCount}`);
  console.log(`Failed / Missing: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\nList of missing or failed files:');
    console.log(JSON.stringify(failed, null, 2));
  }
}

main().catch(console.error);
