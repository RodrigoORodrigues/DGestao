const regex2 = /(?:^|\s)([\w\/\-.,()& ]+?)\s+(\d{1,3})\s+(\d{1,3})\s+(?:R\$ ?)?([\d.]+,\d{2})\s+(?:R\$ ?)?([\d.]+,\d{2})(?=\s|$)/g;
const line = "100 1 984 001051750/1 282144 00876 2,00 GUSTAVO SANTOS DE ALMEIDA 00 16 R$ 1.444,22 R$ 28,88";
let m = regex2.exec(line);
if (m) console.log(m[1], "|", m[2], m[3], m[4], m[5]);
