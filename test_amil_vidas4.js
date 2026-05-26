const str = "Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas 3";
const regexVidas = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Vidas?|Benefici[aá]rios?))?|Vidas?|Benefici[aá]rios?)\s*(?::\s*|-)?\s*(\d+)/i;
console.log(regexVidas.exec(str));
