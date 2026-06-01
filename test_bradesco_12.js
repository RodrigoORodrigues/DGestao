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
        matches.sort((a,b) => a.index - b.index);
        let matchObj = matches[0]; // pick first matching strategy? No, wait. 2 is stronger than 3.
        
        let type2or1 = matches.filter(x => x.type === 1 || x.type === 2);
        if (type2or1.length > 0) matchObj = type2or1[0];
        
        let prefix = null;
        if (matchObj.type === 1) prefix = matchObj.match[1];
        if (matchObj.type === 2) prefix = matchObj.match[1];
        if (matchObj.type === 3) prefix = matchObj.match[1];
        
        console.log("MATCH", matchObj.type, prefix);
    } else {
        console.log("NO MATCH", line);
    }
});
