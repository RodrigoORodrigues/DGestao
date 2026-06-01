const parseCurrencyValue = (v) => parseFloat(v.replace(/\./g, '').replace(',', '.'));
const text = `Demonstrativo de Tributação
Valor Bruto (D+E) - F R$ 219,71
Acumulado No Pagamento
`;
const textoUpper = text.toUpperCase();
const matchTotal = textoUpper.match(/VALOR\s+BRUTO\s*\(D\+E\)\s*-\s*F\s*(?:R\$)?\s*([\d.]+,\d{2})/);
console.log(matchTotal ? parseCurrencyValue(matchTotal[1]) : 0);
