const parseCurrencyValue = (v) => parseFloat(v.replace(/\./g, '').replace(',', '.'));
const lines = [
    "100 1 984 001051750/1 282144 00876 2,00 GUSTAVO SANTOS DE ALMEIDA 00 16 R$ 1.444,22 R$ 28,88",
    "100 1 984 001051750/1 282144 00876 2,00 FERNANDA TRINDADE SANTOS ALMEIDA 01 16 R$ 1.186,16 R$ 23,72",
    "100 1 984 001051750/1 282144 00876 2,00 GUSTAVO TRINDADE ANTONIO DE ALMEI02 16 R$ 589,60 R$ 11,79",
    "100 2 984 001051750/1 282144 00876 2,00 RAFAEL LUCAS SOUSA DO NASCIMENTO 00 16 R$ 841,82 R$ 16,84",
    "100 1 984 001089679/1 281744 00876 3,00 CAROLINA M MOREIRA NEWMAN TARDELL00 10 R$ 1.638,97 R$ 49,17",
];

const regex1 = /(?:^|\s)([\w\/\-.,()& ]+?)\s+(\d{1,3})\s+(?:R\$ ?)?([\d.]+,\d{2})\s+([\d,]+(?:%|))\s+(?:R\$ ?)?([\d.]+,\d{2})(?=\s|$)/g;
const regex2 = /(?:^|\s)([\w\/\-.,()& ]+?)\s+(\d{1,3})\s+(\d{1,3})\s+(?:R\$ ?)?([\d.]+,\d{2})\s+(?:R\$ ?)?([\d.]+,\d{2})(?=\s|$)/g;
const regex3 = /(?:^|\s)([\w\/\-.,()& ]+?)\s+(\d{1,3})\s+(?:R\$ ?)?([\d.]+,\d{2})\s+(?:R\$ ?)?([\d.]+,\d{2})(?=\s|$)/g;

lines.forEach(line => {
    let matches = [];
    let m;
    regex1.lastIndex = 0; regex2.lastIndex = 0; regex3.lastIndex = 0;
    while ((m = regex1.exec(line)) !== null) matches.push({ type: 1, match: m, index: m.index });
    while ((m = regex2.exec(line)) !== null) matches.push({ type: 2, match: m, index: m.index });
    while ((m = regex3.exec(line)) !== null) matches.push({ type: 3, match: m, index: m.index });

    if (matches.length > 0) {
        matches.sort((a,b) => {
            if (a.index !== b.index) return a.index - b.index;
            return a.type - b.type; // Preference regex1 < regex2 < regex3
        });
        
        let matchObj = matches[0];
        
        // Ensure priority regex1 or regex2 overrides regex3.
        let betterMatch = matches.find(x => x.type === 1 || x.type === 2);
        if (betterMatch) matchObj = betterMatch;

        let prefix = null, parcela = null, valA = null, valB = null;

        if (matchObj.type === 1) { 
            prefix = matchObj.match[1]; 
            parcela = matchObj.match[2]; 
            valA = parseCurrencyValue(matchObj.match[3]); 
            valB = parseCurrencyValue(matchObj.match[5]); 
        } else if (matchObj.type === 2) { 
            prefix = matchObj.match[1]; 
            parcela = matchObj.match[3];  // the actual parcela is usually the second one
            valA = parseCurrencyValue(matchObj.match[4]); 
            valB = parseCurrencyValue(matchObj.match[5]); 
        } else if (matchObj.type === 3) {
            prefix = matchObj.match[1]; 
            parcela = matchObj.match[2]; 
            valA = parseCurrencyValue(matchObj.match[3]); 
            valB = parseCurrencyValue(matchObj.match[4]); 
        }

        const tokens = prefix.trim().split(/\s+/);
        let codes = [];
        let nameParts = [];
        tokens.forEach(t => { 
            if (/^[0-9A-Z/\-.%,]+$/.test(t) && !/^[A-ZÀ-ÿ]+$/.test(t) && /[0-9]/.test(t)) codes.push(t); 
            else nameParts.push(t);
        });
        
        let firstWordIdx = tokens.findIndex(t => /[A-Za-zÀ-ÿ]/.test(t) && !/^\d+[A-Z]?$/.test(t));
        if (firstWordIdx === -1) firstWordIdx = 0;
        let nomeReal = tokens.slice(firstWordIdx).join(' ').replace(/\s*\d{2}$/, '').replace(/[\s-]+$/, '').trim();
        let contratoVal = codes.filter(c => c.length > 5)[0] || codes[0] || '';

        let comissaoVal = Math.min(valA, valB);
        let valorTotalVal = Math.max(valA, valB);

        console.log({ nome: nomeReal, cont: contratoVal, p: parcela, c: comissaoVal, t: valorTotalVal, type: matchObj.type });
    } else {
        console.log("NO MATCH", line);
    }
});
