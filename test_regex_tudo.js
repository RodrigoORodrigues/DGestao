const regexValoresSeq = /(?:(?<!\d)(\d{1,4})\s+)?(?:(?:\d{1,2},\d{2}\s+)?([\d\.]+,\d{2})\s+([\d\.]+,\d{2}))(?:\s*(?:(?:Benef|Qtd)[^\d]*|\b\d{4,}\b|$|Médico))/i;
const fallbackVidas = /(?<!\d)(\d{1,4})(?!\d)\s+(?:\d{1,2},\d{2}\s+)?(?:[\d\.]+,\d{2})\s+(?:[\d\.]+,\d{2})/i;
const regex3Num = /(?:Qtd[^\d]*?)?(?<!\d)(\d{1,4})\s+(?<!\d)(\d{1,4})\s+(?<!\d)(\d{1,4})(?!\d)\s+(?:[\d.,]+\s+)?[\d.,]+\s+[\d.,]+/i;
const regexVidas = /(?:Qtd(?:[.\s]*(?:de\s*)?(?:Total\s*)?(?:Vidas?|Benef\b|Benefici[aá]rios?))?|Vidas?|Benefici[aá]rios?)\s*(?::\s*|-)?\s*(?<!\d)(\d{1,4})(?!\d)/i;

const tests = [
  "Nome : 22100 - TESTE CLIENTE Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas 3 1.000,00 500,00 Benef. 313828",
  "Sem Repique 10,00 2.000,00 1.000,00 Benef. 313828",
  "22100 - TESTE CLIENTE 3 0 3 10,00 1.000,00 500,00 Benef. 313828",
  "22100 - TESTE CLIENTE 4 10,00 1.000,00 500,00 Médico 123",
  "Qtd. Vidas: 5 1.000,00 50,00",
  "Qtd. Beneficiários 6",
  "Benef. 313828"
];

for(const t of tests) {
  console.log("----");
  console.log("Text:", t);
  let v = "1";
  let m3 = regex3Num.exec(t);
  let mV = regexVidas.exec(t);
  let mFB = fallbackVidas.exec(t);
  let mSeq = regexValoresSeq.exec(t);

  if (mV && parseInt(mV[1], 10) > 0) v = mV[1];
  else if (v !== "1") {}
  else if (m3 && parseInt(m3[3], 10) > 0) v = m3[3];
  else if (mFB && parseInt(mFB[1], 10) > 0) v = mFB[1];
  else if (mSeq && mSeq[1]) v = mSeq[1]; // Wait! `mSeq` logic in App.jsx actually sets v!

  console.log("mV:", mV ? mV[1] : null);
  console.log("mSeq:", mSeq ? mSeq[1] : null);
  console.log("m3:", m3 ? m3[3] : null);
  console.log("mFB:", mFB ? mFB[1] : null);
  console.log("FINAL V:", v);
}
