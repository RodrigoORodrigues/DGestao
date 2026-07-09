import fs from 'fs';

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log('--- Searching for supabase client ---');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('supabase') && line.length < 150) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});
