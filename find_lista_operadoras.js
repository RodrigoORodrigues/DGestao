import fs from 'fs';

const appContent = fs.readFileSync('src/App.jsx', 'utf8');
const lines = appContent.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('LISTA_OPERADORAS') && line.length < 200) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});
