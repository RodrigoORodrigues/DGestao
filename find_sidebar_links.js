import fs from 'fs';

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log('--- Search Results for nfe in JSX ---');
lines.forEach((line, idx) => {
  if (line.includes('currentView ===') || line.includes('currentView === "') || line.includes('currentView ==') || line.includes('nfe')) {
    if (line.includes('<button') || line.includes('<div') || line.includes('currentView') || line.includes('setCurrentView')) {
      console.log(`L${idx+1}: ${line.trim()}`);
    }
  }
});
