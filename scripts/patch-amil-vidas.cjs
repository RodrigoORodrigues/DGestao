const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
let content = fs.readFileSync(appPath, 'utf8');
let changed = false;

const helper = `

        const extractQtdVidasAmil = (bloco) => {
            const raw = String(bloco || '').replace(/\s+/g, ' ').trim();
            if (!raw) return '1';

            const isValidQtdVidas = (value) => {
                const num = parseInt(String(value || '').replace(/\D/g, ''), 10);
                return !isNaN(num) && num > 0 && num <= 9999 ? String(num) : '';
            };

            // Primeiro tenta ler somente campos claramente rotulados como Qtd./Qtde./Quantidade de Vidas.
            // Isso evita confundir percentual, fatura, parcela, contrato ou valores monetários com vidas.
            const explicitPatterns = [
                /(?:Qtd\\.?|Qtde\\.?|Quantidade)\\s*(?:de\\s*)?(?:Vidas|Benefici[áa]rios|Benef\\.?|Titulares)\\s*:?\\s*(\\d{1,4})\\b/i,
                /(?:N[ºo]\\s*)?(?:de\\s*)?Vidas\\s*:?\\s*(\\d{1,4})\\b/i
            ];
            for (const rx of explicitPatterns) {
                const match = raw.match(rx);
                const qtd = match ? isValidQtdVidas(match[1]) : '';
                if (qtd) return qtd;
            }

            // Alguns PDFs da AMIL quebram a linha e deixam as vidas imediatamente após "Sem Repique".
            // Ex.: Sem Repique 12 10,00 1.234,56 123,45
            const afterSemRepique = raw.match(/Sem\\s+Repique\\s+(\\d{1,4})\\s+\\d{1,2},\\d{2}\\s+[\\d.]+,\\d{2}\\s+[\\d.]+,\\d{2}/i);
            const qtdSemRepique = afterSemRepique ? isValidQtdVidas(afterSemRepique[1]) : '';
            if (qtdSemRepique) return qtdSemRepique;

            // Último fallback: quando a linha vem como "<vidas> <percentual> <valor> <comissão> Médico/Odonto".
            const beforeValores = raw.match(/(?:^|\\s)(\\d{1,4})\\s+\\d{1,2},\\d{2}\\s+[\\d.]+,\\d{2}\\s+[\\d.]+,\\d{2}\\s+(?:M[eé]dico|Odonto|Dental|Sa[uú]de)\\b/i);
            const qtdBeforeValores = beforeValores ? isValidQtdVidas(beforeValores[1]) : '';
            return qtdBeforeValores || '1';
        };`;

if (!content.includes('const extractQtdVidasAmil = (bloco) =>')) {
    const marker = "\n        const normalizeHeaderKey = (key) => String(key || '')";
    if (!content.includes(marker)) {
        throw new Error('Marcador normalizeHeaderKey não encontrado em src/App.jsx. Patch AMIL não aplicado.');
    }
    content = content.replace(marker, helper + marker);
    changed = true;
}

const oldBlockPattern = /let valorTotal = 0, comissao = 0;\s*\n\s*let vidasDetectadas = "1";[\s\S]*?\n\s*if \(valorTotal > 0\) \{/;
const newBlock = `let valorTotal = 0, comissao = 0; 
                    let vidasDetectadas = isAmilExtrato ? extractQtdVidasAmil(bloco) : "1";
                    
                    // AMIL: aceita layout com ou sem Qtd. Vidas entre "Sem Repique" e o percentual.
                    // Ex. 1: Sem Repique 10,00 1.234,56 123,45
                    // Ex. 2: Sem Repique 12 10,00 1.234,56 123,45
                    const regexValores = /Sem Repique\\s+(?:(\\d{1,4})\\s+)?(\\d{1,2},\\d{2})\\s+([\\d\\.]+,\\d{2})\\s+([\\d\\.]+,\\d{2})/i; 
                    let matchValores = regexValores.exec(bloco);
                    if (matchValores) { 
                        if (isAmilExtrato && matchValores[1]) vidasDetectadas = matchValores[1];
                        valorTotal = parseFloat(matchValores[3].replace(/\\./g, '').replace(',', '.')); 
                        comissao = parseFloat(matchValores[4].replace(/\\./g, '').replace(',', '.')); 
                    } else {
                        // Fallback tabular: <vidas opcional> <percentual> <valor total> <comissão> Médico/Odonto
                        const regexFallback = /(?:(\\d{1,4})\\s+)?(\\d{1,2},\\d{2})\\s+([\\d\\.]+,\\d{2})\\s+([\\d\\.]+,\\d{2})\\s+(?:M[eé]dico|Odonto|Dental|Sa[uú]de)/i; 
                        let matchFallback = regexFallback.exec(bloco);
                        if(matchFallback){ 
                            if (isAmilExtrato && matchFallback[1]) vidasDetectadas = matchFallback[1];
                            valorTotal = parseFloat(matchFallback[3].replace(/\\./g, '').replace(',', '.')); 
                            comissao = parseFloat(matchFallback[4].replace(/\\./g, '').replace(',', '.')); 
                        }
                    }

                    if (valorTotal > 0) {`;

if (oldBlockPattern.test(content) && !content.includes('let vidasDetectadas = isAmilExtrato ? extractQtdVidasAmil(bloco) : "1";')) {
    content = content.replace(oldBlockPattern, newBlock);
    changed = true;
}

if (changed) {
    fs.writeFileSync(appPath, content, 'utf8');
    console.log('Patch AMIL aplicado: Qtd. Vidas agora usa campos explícitos e layout Sem Repique.');
} else {
    console.log('Patch AMIL já estava aplicado ou não havia bloco antigo para substituir.');
}
