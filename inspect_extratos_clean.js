import fs from 'fs';

const content = fs.readFileSync('extratos.txt', 'utf8');
const lines = content.split('\n');
console.log('extratos.txt has', lines.length, 'lines.');

lines.forEach((line, idx) => {
  if (line.includes('ELIAS') || line.includes('ROSEVAL') || line.includes('ODONTOPREV') || line.includes('BENEFICIARIO') || line.includes('BENEFICIÁRIO')) {
    console.log(`L${idx+1}: ${line.substring(0, 150)}`);
  }
});
