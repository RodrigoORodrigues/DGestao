const text = `Nome/Razão social CPF/CNPJ do cliente Proposta Descrição Produto Valor base Parcela comissionada Competência comissionada Parcela faturada Dat de efetivação do crédito/débito Valor Comissão % Comissão
ISABELA MICELI 1679375709 112141022 TERM LIFE 133,7 33 202604 33 15/04/2026 9,36 7%
ISABELA MICELI 1679375709 112141022 SAF INDIVIDUAL SUPERLUXO - R$7.000 – RIDER 11,16 33 202604 33 15/04/2026 2,46 22%
RICARDO LUCIANO G MELLO BARBEDO 73046132700 111768262 IPA COM MAJORAÇÃO + IFPD 2817,5 38 202604 38 30/04/2026 619,85 22%`;

const regex = /(?:^|\s|\n)([A-ZÀ-ÿ][A-ZÀ-ÿ0-9\s.\-]+?)\s+([\d\.\-\/]{9,18})\s+(\d+)\s+(.+?)\s+([\d.,]+)\s+(\d+)\s+(\d{6})\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+(\d+)\s*%/g;

let match;
let c = 0;
while ((match = regex.exec(text)) !== null) {
  console.log("MATCH", match[1], match[4]);
  c++;
}
if(c===0) console.log("NO MATCHES");
