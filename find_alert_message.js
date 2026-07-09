import fs from 'fs';

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log('--- Searching for alert message ---');
lines.forEach((line, idx) => {
  if (line.includes('Nenhum lançamento') || line.includes('Nenhum lancamento')) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});
