const regexVidas = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Total\s*)?(?:Vidas?|Benef(?:\.|ici[aá]rios?)?))?|Vidas?|Benef(?:ici[aá]rios?)?)\s*(?::\s*|-)?\s*(?<!\d)(\d{1,4})(?!\d)/i;
console.log(regexVidas.exec("22100 - TESTE"));
console.log(regexVidas.exec("Qtd. Vidas 3"));
console.log(regexVidas.exec("Apenas um numero 42 e tal"));
