import fs from 'fs';

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

lines.forEach((line, idx) => {
  if (line.includes('isOdontoprevExtrato')) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});
