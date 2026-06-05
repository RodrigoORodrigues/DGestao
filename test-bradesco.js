import fs from 'fs';
const BRADESCO_CONTRACT_MAPPING = {
  10896791: "FC CONSULTORIA, TREINAMENTOS E COMERCIO LTDA",
  1137060: "PROTETTA CORRETORA DE SEGUROS LTDA"
};

const textoNormalizado = `
10896791 FC CONSULTORIA, TREINAMENTOS E COMERCIO LTDA
JOAO DA SILVA 1 100,00 25% 25,00
MARIA DA SILVA 1 50,00 25% 12,50
JOSE DA SILVA 1 200,00 3% 6,00
1137060 PROTETTA CORRETORA DE SEGUROS LTDA
ANTONIO 1 100,00 25% 25,00
`;

const parseCurrencyValue = (v) => parseFloat(v.replace('.', '').replace(',', '.'));

const regex1 = /(?:^|\s)([\w\/\-.,()& ]+?)\s+(\d{1,3})\s+(?:R\$ ?)?([\d.]+,\d{2})\s+([\d,]+(?:%|))\s+(?:R\$ ?)?([\d.]+,\d{2})(?=\s|$)/g;

let matches = [];
let m;
while ((m = regex1.exec(textoNormalizado)) !== null)
  matches.push({ type: 1, match: m, index: m.index, endIndex: m.index + m[0].length });

let rawItems = [];
for (const matchObj of matches) {
    let prefix = null, parcela = null, valA = null, valB = null, pctA = null;
    if (matchObj.type === 1) {
    prefix = matchObj.match[1];
    parcela = matchObj.match[2];
    pctA = matchObj.match[4];
    valA = parseCurrencyValue(matchObj.match[3]);
    valB = parseCurrencyValue(matchObj.match[5]);
    }
    
    if (prefix) {
    const tokens = prefix.trim().split(/\s+/);
    let codes = [];
    tokens.forEach((t) => {
        if (/^[0-9A-Z/\-.%,]+$/.test(t) && !/^[A-ZÀ-ÿ]+$/.test(t) && /[0-9]/.test(t)) codes.push(t);
    });
    
    let firstWordIdx = tokens.findIndex((t) => /[A-Za-zÀ-ÿ]/.test(t) && !/^\d+[A-Z]?$/.test(t));
    if (firstWordIdx === -1) firstWordIdx = 0;
    let nomeReal = tokens.slice(firstWordIdx).join(" ").trim();
    let contratoVal = codes.filter((c) => c.length > 5)[0] || codes[0] || "";
    
    if (pctA) pctA = pctA.trim().replace(/%$/, "");
    
    rawItems.push({
        index: matchObj.index, parcela, pctA, nomeReal, contratoVal,
        comissaoVal: Math.min(valA, valB), valorTotalVal: Math.max(valA, valB)
    });
    }
}

let titulares = [];
const rxTitular = /(?:^|\n)\s*([0-9]{4,20})\s+([^\n\r]+)/g;
let mt;
while ((mt = rxTitular.exec(textoNormalizado)) !== null) {
    if (!/\d+,\d{2}/.test(mt[0])) {
    let cod = mt[1];
    let nome = mt[2].trim().replace(/\s*[0-9.\-]+\s*$/, "").trim();
    if (BRADESCO_CONTRACT_MAPPING[cod] || BRADESCO_CONTRACT_MAPPING[nome]) {
        nome = BRADESCO_CONTRACT_MAPPING[cod] || BRADESCO_CONTRACT_MAPPING[nome];
    }
    titulares.push({ index: mt.index, contrato: cod, nome: nome });
    }
}

for (const item of rawItems) {
    let nearestTitular = null;
    for (const t of titulares) {
        if (t.index < item.index) nearestTitular = t;
    }
    
    if (nearestTitular) {
        item.finalContrato = nearestTitular.contrato;
        item.finalNome = nearestTitular.nome;
    } else {
        item.finalContrato = item.contratoVal || "";
        item.finalNome = item.nomeReal || "Cliente Desconhecido";
    }
}

let groupedContracts = {};
for (const item of rawItems) {
    let groupKey = `${item.finalContrato}_${item.finalNome}_${item.parcela}_${item.pctA || ""}`;
    if (!groupedContracts[groupKey]) {
    groupedContracts[groupKey] = {
        contrato: item.finalContrato, cliente: item.finalNome, parcela: item.parcela, pct: item.pctA,
        valorTotal: 0, comissao: 0, vidas: 0
    };
    }
    groupedContracts[groupKey].valorTotal += item.valorTotalVal;
    groupedContracts[groupKey].comissao += item.comissaoVal;
    groupedContracts[groupKey].vidas += 1;
}

console.log(JSON.stringify(groupedContracts, null, 2));
