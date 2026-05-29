const text = `Nome : 22100 - TESTE CLIENTE Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas 3 1.000,00 500,00 Benef. 313828`;
const regex3Num = /(?:Qtd[^\d]*?)?(?<!\d)(\d{1,4})\s+(?<!\d)(\d{1,4})\s+(?<!\d)(\d{1,4})(?!\d)\s+(?:[\d.,]+\s+)?[\d.,]+\s+[\d.,]+/i;
const fallbackVidas = /(?:\s+)(?<!\d)(\d{1,4})(?!\d)\s+(?:\d{1,2},\d{2}\s+)?(?:[\d\.]+,\d{2})\s+(?:[\d\.]+,\d{2})/i; 
const regexVidas = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Total\s*)?(?:Vidas?|Benef(?:\.|ici[aá]rios?)?))?|Vidas?|Benef(?:ici[aá]rios?)?)\s*(?::\s*|-)?\s*(?<!\d)(\d{1,4})(?!\d)/i; 
console.log("3num:", regex3Num.exec(text));
console.log("fallback:", fallbackVidas.exec(text));
console.log("vidas:", regexVidas.exec(text));
