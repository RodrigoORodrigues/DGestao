import fs from 'fs';
import path from 'path';

function normalizeKey(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function run() {
  const csvPath = path.join(process.cwd(), 'user_data.txt');
  const content = fs.readFileSync(csvPath, 'utf-8');
  
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  
  const byContrato = {};
  const byCliente = {};
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parser for quoted fields
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());
    
    if (fields.length < 5) continue;
    
    const [cliente, contrato, vidas, vitalicio, corretor] = fields;
    
    const record = {
      cliente,
      contrato: contrato === '------' ? '' : contrato,
      vidas: vidas === '------' ? '' : vidas,
      vitalicio: vitalicio === '------' ? '' : (vitalicio === 'Sim' ? 'Sim' : (vitalicio === 'Não' ? 'Não' : vitalicio)),
      corretor: corretor === '------' ? '' : corretor
    };
    
    if (record.contrato) {
      const contractKey = normalizeKey(record.contrato);
      if (contractKey) {
        byContrato[contractKey] = record;
      }
    }
    
    if (record.cliente) {
      const clientKey = normalizeKey(record.cliente);
      if (clientKey) {
        byCliente[clientKey] = record;
      }
    }
  }
  
  const outputContent = `// Generated automatically from user_data.txt
export const CLIENT_METADATA_BY_CONTRATO = ${JSON.stringify(byContrato, null, 2)};
export const CLIENT_METADATA_BY_CLIENTE = ${JSON.stringify(byCliente, null, 2)};

export function findClientMetadata(clienteName, contratoNumber) {
  // Normalize lookup keys
  const contractKey = String(contratoNumber || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
  if (contractKey && CLIENT_METADATA_BY_CONTRATO[contractKey]) {
    return CLIENT_METADATA_BY_CONTRATO[contractKey];
  }

  const clientKey = String(clienteName || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
  if (clientKey && CLIENT_METADATA_BY_CLIENTE[clientKey]) {
    return CLIENT_METADATA_BY_CLIENTE[clientKey];
  }

  // Substring matching as fallback
  if (clientKey) {
    const keys = Object.keys(CLIENT_METADATA_BY_CLIENTE);
    const foundKey = keys.find(k => k.includes(clientKey) || clientKey.includes(k));
    if (foundKey) {
      return CLIENT_METADATA_BY_CLIENTE[foundKey];
    }
  }

  return null;
}
`;

  fs.mkdirSync(path.join(process.cwd(), 'src', 'utils'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'src', 'utils', 'clientMetadata.js'), outputContent, 'utf-8');
  console.log('Successfully generated src/utils/clientMetadata.js!');
}

run();
