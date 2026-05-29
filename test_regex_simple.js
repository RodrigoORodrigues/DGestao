const regexVidasAmil = /(?:Qtd[^\d]*?|Vidas?\s*:?\s*|Benef[a-zÀ-ÿ.]*\s*:?\s*)(?<!\d)(\d{1,4})(?!\d)/i;

const tests = [
  "Nome : 22100 - TESTE CLIENTE Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas 3 1.000,00 500,00 Benef. 313828",
  "Sem Repique 10,00 2.000,00 1.000,00 Benef. 313828",
  "Qtd. Vidas: 5",
  "Beneficiário: 12",
  "Benef. 3",
  "Benef. 313828"
];

for (let t of tests) {
  let mV = regexVidasAmil.exec(t);
  console.log(t, " => ", mV ? mV[1] : null);
}
