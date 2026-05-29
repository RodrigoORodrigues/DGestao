const blocos = [
    "1.000,00 500,00",
    "10,00 1.000,00 500,00 Benef. 313828 Data 10/10/2023",
    "3 1.000,00 500,00 313828",
    "10,00 1.000,00 500,00 Qtd"
];
for(let bloco of blocos) {
    const regexValores3 = /(?:(?:\d{1,2},\d{2}\s+)?([\d\.]+,\d{2})\s+([\d\.]+,\d{2}))(?:.*?)$/i;
    let m = regexValores3.exec(bloco);
    console.log(m?.[1], m?.[2]);
}
