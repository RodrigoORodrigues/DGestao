const str1 = "22100 - TESTE CLIENTE Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas 3 1.000,00 500,00 Benef. 313828";
const str2 = "22100 - TESTE CLIENTE 3 0 3 10,00 1.000,00 500,00 Benef. 313828";
const str3 = "Sem Repique 10,00 2.000,00 1.000,00 Benef. 313828";
const str4 = "22100 - TESTE CLIENTE 10,00 1.000,00 500,00 Médico";
const str5 = "123456 Nome: MARIA DAS GRACAS \n 1 10,00 2.000,00 1.000,00";
const strs = [str1, str2, str3, str4, str5];

const regexValoresSeq = /(?:(?<!\d)(\d{1,4})\s+)?(?:(?:\d{1,2},\d{2}\s+)?([\d\.]+,\d{2})\s+([\d\.]+,\d{2}))(?:\s*(?:(?:Benef|Qtd)[^\d]*|\b\d{4,}\b|$|Médico))/i;

for (let s of strs) {
  console.log(regexValoresSeq.exec(s));
}
