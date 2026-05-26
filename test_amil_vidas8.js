const str1 = "Qtd. Total Benef. Qtd. Cart. Benef. Qtd. Vidas 4 1 3 1.000,00 500,00";
const str2 = "Qtd. Total Benef. 4 Qtd. Cart. Benef. 1 Qtd. Vidas 3 1.000,00 500,00";
const str3 = "4 1 3 1.000,00 500,00";

const regexAmilSequence = /(?:Qtd[^\n\d]+)?(?:Benef[^\n\d]+Vidas[^\n\d]+)?(\d+)\s+(\d+)\s+(\d+)\s+(?:[\d.,]+\s+)?[\d.,]+\s+[\d.,]+/i;
const regexAmil3Num = /(\d+)\s+(\d+)\s+(\d+)\s+(?:[\d.,]+\s+)?[\d.,]+\s+[\d.,]+/i;

console.log("str1", regexAmil3Num.exec(str1)?.[3]);
console.log("str2", regexAmil3Num.exec(str2)?.[3]);
console.log("str3", regexAmil3Num.exec(str3)?.[3]);

