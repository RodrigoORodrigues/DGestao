const regex = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Total\s*)?(?:Vidas?|Benef(?:\.|ici[aá]rios?)?))?|Vidas?|Benef(?:ici[aá]rios?)?)\s*(?::\s*|-)?\s*(?<!\d)(\d{1,4})(?!\d)/ig;
const exec = (str) => {
    let match;
    while((match = regex.exec(str)) !== null) console.log(match);
}
exec("Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas 3 1.000,00 500,00 Benef. 313828");
