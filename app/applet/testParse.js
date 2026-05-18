const txt = 'SUPERMED (AMIL) 96599951 MONICA MARIA CADECO DE 3 30/03/2026 Comissão COMISSÃO VALOR PARCELA: R$ 3.807,71 (1,00%) 38,08 C';
const rx = /SUPERMED\s*(?:\([^)]+\))?\s+(\d+)\s+(.*?)\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+Comiss.o.*?R\$\s*([\d.,]+)(?:\s*\([^)]+\))?\s+([\d.,]+)\s*C/i;
console.log(rx.exec(txt));
