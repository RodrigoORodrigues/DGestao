const text = `Nome : 22100 - TESTE CLIENTE Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas   3 1.000,00 500,00 Benef. 313828`;
const oldRegex = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Vidas?|Benefici[aá]rios?))?|Vidas?|Benefici[aá]rios?)\s*(?::\s*|-)?\s*(?<!\d)(\d{1,4})(?!\d)/i;
console.log(oldRegex.exec(text));
