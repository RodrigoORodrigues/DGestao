const bloco = "22100 - TESTE CLIENTE Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas 3 1.000,00 500,00 Benef. 313828";
const regex3Num = /(?:Qtd[^\d]*?)?(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(?:[\d.,]+\s+)?[\d.,]+\s+[\d.,]+/i;
console.log(regex3Num.exec(bloco));

const regexVidas = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Vidas?|Benefici[aá]rios?))?|Vidas?|Benefici[aá]rios?)\s*(?::\s*|-)?\s*(\d{1,4})(?!\d)/i;
console.log(regexVidas.exec(bloco));

const regexVidasOld = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Vidas?|Benefici[aá]rios?))?|Vidas?|Benefici[aá]rios?)\s*(?::\s*|-)?\s*(\d+)/i;
console.log(regexVidasOld.exec(bloco));
