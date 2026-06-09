const r = "12331588          1128951                                                       23           04/2026             1.416,08 Médico   1           05/05/2026    20/05/2026       Venda canal externo   Comissão                        3,34          1.416,08             47,30";

let matchBase = r.match(/^(\d{5,12})\s+(\S+)/);
let matchRefRow = r.match(/^(\d{5,12})\s+(\S+)\s+(\d{1,4})?\s+(\d{2}\/\d{4})/);

let mDate = r.match(
  /(\d{1,4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{4}|\d{2}\/\d{2}\/\d{4})/,
);
let mValue = r.match(/([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?$/);

console.log({matchBase, matchRefRow, mDate, mValue});
