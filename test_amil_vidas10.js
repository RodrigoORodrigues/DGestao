const blocos = [
    "Qtd. Total Benef. Qtd. Cart. Benef. Qtd. Vidas 4 1 3 1.000,00 500,00",
    "Qtd. Vidas 4 1 3 10,00 1.000,00 500,00",
    "4 1 3 1.000,00 500,00",
    "Qtd. Total Benef. 4 Qtd. Cart. Benef. 1 Qtd. Vidas 3 1.000,00 500,00",
];

for(let bloco of blocos) {
    const regex3Num = /(?:Qtd[^\d]*?)?(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(?:[\d.,]+\s+)?[\d.,]+\s+[\d.,]+/i;
    let match3Num = regex3Num.exec(bloco);

    const regexVidas = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Vidas?|Benefici[aá]rios?))?|Vidas?|Benefici[aá]rios?)\s*(?::\s*|-)?\s*(\d+)/i; 
    let matchVidas = regexVidas.exec(bloco);
    
    let vidas = "1";
    if (match3Num && parseInt(match3Num[3], 10) > 0) {
        vidas = parseInt(match3Num[3], 10).toString();
    } else if (matchVidas && parseInt(matchVidas[1], 10) > 0) { 
        vidas = parseInt(matchVidas[1], 10).toString(); 
    }
    
    console.log("bloco:", bloco);
    console.log("vidas:", vidas);
    console.log("-------");
}
