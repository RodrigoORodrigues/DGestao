import fs from 'fs';

let content = fs.readFileSync('src/App.jsx', 'utf8');

const startMarker = "{/* ECRÃ 11: INCONSISTÊNCIAS DE PARCELAS */}";
const endMarker = "{/* NOVO DASHBOARD */}";

let startIdx = content.indexOf(startMarker);
let endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + content.substring(endIdx);
  console.log("Removed ECRÃ 11 from src/App.jsx");
} else {
  console.log("UI Markers not found!");
}

const funcStart = "  const calcularInconsistencias = (";
const funcEndMarker = "  const displayedVendas = getFilteredVendas();";
let funcStartIdx = content.indexOf(funcStart);
let funcEndIdx = content.indexOf(funcEndMarker);

if (funcStartIdx !== -1 && funcEndIdx !== -1) {
  content = content.substring(0, funcStartIdx) + content.substring(funcEndIdx);
  console.log("Removed functions from src/App.jsx");
} else {
  console.log("Function Markers not found!");
}

fs.writeFileSync('src/App.jsx', content);
