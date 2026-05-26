const blocos = [
    "22100 - TESTE CLIENTE UM 3 0 3 1.000,00 500,00",
    "22100 - TESTE CLIENTE UM Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas 3",
    "22100 - TESTE CLIENTE UM 3 0 3 10,00 1.000,00 500,00",
];

for(let bloco of blocos) {
    let valorTotal = 0, comissao = 0; 
    let vidasDetectadas = "1";
    
    const regexValores = /Sem Repique\s+(\d{1,2},\d{2})\s+([\d\.]+,\d{2})\s+([\d\.]+,\d{2})/i; 
    let matchValores = regexValores.exec(bloco);
    
    // ...
    
    const fallbackVidas = /(?:\s+)(\d{1,3})\s+(?:\d{1,2},\d{2}\s+)?(?:[\d\.]+,\d{2})\s+(?:[\d\.]+,\d{2})/i; 
    let matchFallbackVidas = fallbackVidas.exec(bloco);
    
    // Updated to handle standard AMIL format where Qtd is followed by values
    const amilDetailedVidas = /(?:(\d+)\s+(\d+)\s+(\d+)\s+([\d\.]+,\d{2})\s+([\d\.]+,\d{2}))/i;
    let matchAmilDetailed = amilDetailedVidas.exec(bloco);

    const regexVidas = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Vidas?|Benefici[aá]rios?|Total\s+Benef\.?))?|Vidas?|Benefici[aá]rios?)\s*(?::\s*|-)?\s*(\d+)/i; 
    let matchVidas = regexVidas.exec(bloco);
    
    console.log("-------");
    console.log("bloco", bloco);
    console.log("matchVidas", matchVidas?.[1]);
    console.log("matchFallbackVidas", matchFallbackVidas?.[1]);
    console.log("matchAmilDetailed", matchAmilDetailed?.[1]);
}
