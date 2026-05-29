const regex = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Total\s*)?(?:Vidas?|Benef(?:\.|ici[aá]rios?)?))?|Vidas?|Benef(?:ici[aá]rios?)?)\s*(?::\s*|-)?\s*(?<!\d)(\d{1,4})(?!\d)/i;
console.log(regex.exec("Qtd. Total Benef. 3"));
console.log(regex.exec("Qtd. Vidas 4"));
console.log(regex.exec("Qtd. Beneficiários 5"));
console.log(regex.exec("Beneficiário 6"));
console.log(regex.exec("Benef. 313828"));
