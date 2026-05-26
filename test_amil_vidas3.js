const fallbackVidas = /(?:\s+)(\d{1,3})\s+(?:\d{1,2},\d{2}\s+)?(?:[\d\.]+,\d{2})\s+(?:[\d\.]+,\d{2})/i;
let matchFallbackVidas = fallbackVidas.exec(" 3 0 3 1.000,00 500,00");
console.log(matchFallbackVidas);
