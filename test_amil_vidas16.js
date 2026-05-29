const regex3Num = /(?:Qtd[^\d]*?)?(?<!\d)(\d{1,4})\s+(?<!\d)(\d{1,4})\s+(?<!\d)(\d{1,4})(?!\d)\s+(?:[\d.,]+\s+)?[\d.,]+\s+[\d.,]+/i;
console.log(regex3Num.exec("Qtd 3 0 3 10,00 1.000,00 500,00"));

const str = "22100 - TESTE CLIENTE Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas   3 1.000,00 500,00 Benef. 313828";
const regex = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Total\s*)?(?:Vidas?|Benef(?:\.|ici[aá]rios?)?))?|Vidas?|Benef(?:ici[aá]rios?)?)\s*(?::\s*|-)?\s*(?<!\d)(\d{1,4})(?!\d)/ig;

let match;
while ((match = regex.exec(str)) !== null) {
  console.log("Matched:", match[0], "Capture:", match[1]);
}
