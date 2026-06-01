const fs = require('fs');
const bloco = `969601536130 - TANIA TAVARES BARBOSA                                                                                                              Vendedor: 4939 - MARTA MACHADO GOMES                                                                                                                           Data início vigência: 26/06/2024\n` + 
`Fatura              Proposta / Beneficiário                                       Parcela Referência Valor fatura Produto Vidas Vencimento Data Operação Função venda Rubrica comissão     Percentual Base cálculo Comissão\n` + 
`12331588          1128951                                                       23           04/2026             1.416,08 Médico   1           05/05/2026    20/05/2026       Venda canal externo   Comissão                        3,34          1.416,08             47,30 \n` + 
`12331589          1128951                                                       24           05/2026             1.416,08 Médico   1           05/06/2026    20/05/2026       Venda canal externo   Comissão                        3,34          1.416,08             47,30 `;

let codCliente = "N/D", nomeCliente = "";
const matchNome = bloco.match(/^(\d+)\s*(?:-)?\s*(.+?)(?=\s+Vendedor:|\s+Fatura|\s+Proposta|\s+Data|\s+Qtd|\s+Forma|\s+\d{2}\/\d{4})/i);
if (matchNome) { 
    codCliente = matchNome[1].trim(); 
    nomeCliente = matchNome[2].trim(); 
}
console.log({codCliente, nomeCliente});

// Extract all rows!
// Look at the rows: 12331588 1128951 23 04/2026 1.416,08 Médico 1 05/05/2026 20/05/2026 Venda canal externo Comissão 3,34 1.416,08 47,30
// Since fields might vary slightly, let's just make it robust.
// Fatura (num) | Proposta (num/text) | Parcela (num) | Referencia (mm/yyyy) | Valor (num) | Prod | Vidas | Vencimento (dd/mm/yyyy) | Data op (dd/mm/yyyy) | Função | Rubrica | Percentual | Base | Comissão
const regexRow = /^(\d+)\s+(.+?)\s+(\d{1,3})\s+(\d{2}\/\d{4})\s+([\d.,]+)\s+(.+?)\s+(\d{1,5})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/gm;

let match;
while ((match = regexRow.exec(bloco)) !== null) {
   console.log({
       fatura: match[1],
       proposta: match[2],
       parcela: match[3],
       ref: match[4],
       valor_fatura: match[5],
       produto: match[6],
       vidas: match[7],
       vencimento: match[8],
       data_op: match[9],
       funcao_etc: match[10],
       perc: match[11],
       base: match[12],
       comissao: match[13]
   });
}
