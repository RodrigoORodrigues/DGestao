const blocos = [
    "22100 - TESTE CLIENTE Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas 3 1.000,00 500,00 Benef. 313828",
    "22100 - TESTE CLIENTE 3 0 3 10,00 1.000,00 500,00 Benef. 313828",
    "22100 - TESTE CLIENTE Qtd. Vidas 4 10,00 1.000,00 500,00",
    "Sem Repique 10,00 2.000,00 1.000,00 Benef. 313828",
    "22100 - TESTE CLIENTE 10,00 1.000,00 500,00 Médico"
];

for (const bloco of blocos) {
    let valorTotal = 0, comissao = 0;
    
    // First try standard Amil formats
    const regexValores1 = /Sem Repique\s+(\d{1,2},\d{2})\s+([\d\.]+,\d{2})\s+([\d\.]+,\d{2})/i; 
    let m1 = regexValores1.exec(bloco);
    
    const regexValores2 = /(\d{1,2},\d{2})\s+([\d\.]+,\d{2})\s+([\d\.]+,\d{2})\s+Médico/i; 
    let m2 = regexValores2.exec(bloco);

    const regexValoresFallback = /(.*?)(?:(?:\d{1,2},\d{2}\s+)?([\d\.]+,\d{2})\s+([\d\.]+,\d{2}))(?:\s*Benef|\s*Qtd|$|\s*)/i;
    // Let's refine the fallback to just look for two currency values near the end of the string, or before Benef
    const regexValores3 = /(?:(?:\d{1,2},\d{2}\s+)?([\d\.]+,\d{2})\s+([\d\.]+,\d{2}))(?:\s*(?:Benef|\b\d{6,}\b|$))/i;
    let m3 = regexValores3.exec(bloco);
    
    if (m1) {
        valorTotal = parseFloat(m1[2].replace(/\./g, '').replace(',', '.'));
        comissao = parseFloat(m1[3].replace(/\./g, '').replace(',', '.'));
    } else if (m2) {
        valorTotal = parseFloat(m2[2].replace(/\./g, '').replace(',', '.'));
        comissao = parseFloat(m2[3].replace(/\./g, '').replace(',', '.'));
    } else if (m3) {
        valorTotal = parseFloat(m3[1].replace(/\./g, '').replace(',', '.'));
        comissao = parseFloat(m3[2].replace(/\./g, '').replace(',', '.'));
    }

    console.log("bloco:", bloco);
    console.log("valorTotal:", valorTotal, "comissao:", comissao);
}
