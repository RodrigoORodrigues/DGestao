const parseCurrencyValue = (v) => parseFloat(v.replace(/\./g, '').replace(',', '.'));
const text = `ANDREA DOS REIS AVOLIO Porto 87 378 4002676 0 0 0 2025-12-24 1.081,34 1,00 10,81 89-COMISSAO TOTAL
ANDREA DOS REIS AVOLIO Porto 87 1391 601090 1248709 10 1 2025-12-23 338,30 1,00 3,38 45-COMISSAO FRACIONADA
Cartao de Credito EPS CPF.079432257.32 87 531 0/0 0 2026-01-21 20,00 100,00 20,00 105-VENDA AVULSA PORTO VISA
CRISTINA CID SALOMON Porto 87 531 3874247 0 1 0 2025-12-18 -191,99 10,00 -19,20 72-CANCELAMENTO DA APOLICE`;

const portoRegex = /([a-zA-ZÀ-ÿ0-9 :"'()&.-]+?)\s+(?:Porto\s+)?(\d{2,3})\s+(\d+)\s+([\d/A-Za-z]+)(?:\s+(\d+))?\s+(\d+)\s+(?:(\d+)\s+)?(\d{4}-\d{2}-\d{2})\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s+(\d{1,4})-(.+)/gi;

let m;
while ((m = portoRegex.exec(text)) !== null) {
    console.log("MATCH:");
    console.log("  Cliente:", m[1]);
    console.log("  Valor A:", m[9], "->", parseCurrencyValue(m[9]));
    console.log("  Valor B:", m[11], "->", parseCurrencyValue(m[11]));
    console.log("  Tipo:", m[13]);
}
