import fs from 'fs';

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log('--- Searching for Supabase config ---');
lines.forEach((line, idx) => {
  if (line.includes('supabaseUrl') || line.includes('supabaseKey') || line.includes('createClient')) {
    if (line.length < 160) {
      console.log(`L${idx+1}: ${line.trim()}`);
    }
  }
});
