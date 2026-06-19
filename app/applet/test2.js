const text = `ANDRE AUGUSTO PENNA FRANCA 66580650710 115232549 WHOLE LIFE SUCESSÃO 1003,96 1 1 ESTORNO ANGARIACAO_ESTORNO 29/05/2026 0% 0 0% 1003,96 1 199 ESTORNO ANGARIACAO INDIVIDUAL DEBITO
FLÁVIA FREITAS MARTINS 4983296662 112927658 ASSISTÊNCIA PROTEÇÃO PET 7,63 26 25 COMISSAO CARTEIRA_COMISSAO 29/05/2026 0% 1,68 22% 0 0 22 CARTEIRA SERVICOS SAF CREDITO
VIVIAN BARROS MARTINS 5287425660 112519004 TERM LIFE 122,02 30 30 ADIANTAMENTO CARTEIRA CARTEIRA_COMISSAO 29/05/2026 0% 8,54 7% 0 0 540 CARTEIRA INDIVIDUAL VIA CARTAO CREDITO`;

const regex = /(?:^|\s|\n)([A-ZÀ-ÿ][A-ZÀ-ÿ0-9\s.\-]+?)\s+([\d\.\-\/]{9,18})\s+(\d+)\s+(.+?)\s+([\d.,]+)\s+(\d+)\s+(\d+)\s+([A-Z\s]+?)\s+([A-Z_]+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+%?)\s+(-?[\d.,]+)\s+(\d+)\s*%/gi;

let match;
let c = 0;
while ((match = regex.exec(text)) !== null) {
  console.log("MATCH", "|", match[1], "|", match[3], "|", match[4], "|", match[5], "|", match[12], "|", match[13]);
  c++;
}
if(c===0) console.log("NO MATCHES");
