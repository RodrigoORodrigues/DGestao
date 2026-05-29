const fallbackVidas = /(?:\s+)(\d{1,4})(?!\d)\s+(?:\d{1,2},\d{2}\s+)?(?:[\d\.]+,\d{2})\s+(?:[\d\.]+,\d{2})/i; 
console.log(fallbackVidas.exec(" 313828 10,00 1.000,00 500,00"));

const regex3Num = /(?:Qtd[^\d]*?)?(\d{1,4})\s+(\d{1,4})\s+(\d{1,4})(?!\d)\s+(?:[\d.,]+\s+)?[\d.,]+\s+[\d.,]+/i;
console.log(regex3Num.exec("Qtd 313828 10 3 10,00 1.000,00 500,00"));
