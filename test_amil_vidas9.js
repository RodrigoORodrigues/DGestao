const blocos = [
    "22100 - TESTE CLIENTE UM 3 1 2 1.000,00 500,00",
    "22100 - TESTE CLIENTE DOIS 2 1.000,00 500,00",
    "22100 - TESTE CLIENTE TRES Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas 3 1.000,00 500,00",
];

const fallbackVidas = /(?:\s+)(\d{1,3})\s+(?:\d{1,2},\d{2}\s+)?(?:[\d\.]+,\d{2})\s+(?:[\d\.]+,\d{2})/i;

for(let bloco of blocos) {
    let matchFallback = fallbackVidas.exec(bloco);
    
    // We can also check if there is a sequence of 3 numbers
    let amil3Num = /(?:^|\s)(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(?:[\d.,]+\s+)?[\d.,]+\s+[\d.,]+/.exec(bloco);
    
    console.log("bloco:", bloco);
    console.log("fallback:", matchFallback?.[1]);
    console.log("amil3Num:", amil3Num?.[3]);
    console.log("-------");
}
