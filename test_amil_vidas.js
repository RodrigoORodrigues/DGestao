const blocos = [
    "22100 - TESTE CLIENTE UM Vidas: 3 1.000,00 500,00",
    "22101 - TESTE CLIENTE DOIS Qtd. Vidas 4 1500,00 750,00",
    "Qtd. de Parcela: 0 \n 22102 - TESTE CLIENTE TRES 5 50,00 2.000,00 1.000,00",
    "Qtd: 0 \n 22103 - TESTE CLIENTE QUATRO 02 1.000,00 500,00",
    "22104 - TESTE CLIENTE CINCO Qtd. Beneficiários 6 1.000,00 500,00"
];

for(let bloco of blocos) {
    let vidasDetectadas = "1";
    const fallbackVidas = /(?:\s+)(?!0)(\d{1,3})\s+(?:\d{1,2},\d{2}\s+)?(?:[\d\.]+,\d{2})\s+(?:[\d\.]+,\d{2})/i; 
    let matchFallbackVidas = fallbackVidas.exec(bloco);
    
    // Improved regex to also match Beneficiários
    const regexVidas = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Vidas?|Benefici[aá]rios?))?|Vidas?|Benefici[aá]rios?)\s*(?::\s*|-)?\s*(\d+)/i; 
    let matchVidas = regexVidas.exec(bloco);
    
    if (matchVidas && parseInt(matchVidas[1], 10) > 0) { 
        vidasDetectadas = parseInt(matchVidas[1], 10).toString(); 
    } else if (matchFallbackVidas) {
        vidasDetectadas = parseInt(matchFallbackVidas[1], 10).toString();
    }
    console.log("vidas:", vidasDetectadas, "-", bloco.split('-')[1]?.substring(0,25).trim());
}
