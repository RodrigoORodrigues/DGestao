const str = "Qtd. Total Benef. Qtd. Cart. Benef. Qtd. Vidas 3 0 3";
const regexVidas = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Vidas?|Benefici[aá]rios?))?|Vidas?|Benefici[aá]rios?)\s*(?::\s*|-)?\s*(\d+)/i;
console.log(regexVidas.exec(str));
