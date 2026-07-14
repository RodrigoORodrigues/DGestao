import fs from 'fs';

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log('--- Search Results for FATURAMENTO ---');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('faturamento')) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});
