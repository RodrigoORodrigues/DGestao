const regex = /(?:^|\s)(?:\d{3}\s+)?(?:\d+\s+\d+\s+)?([0-9A-Z\/.\-]+)\s+(\d+)\s+(\d+)\s+([\d,]+(?:%|))\s+(.*?)\s+(\d{1,2})\s+(\d{1,4})\s+(?:R\$)?\s*([\d.]+,\d{2})\s+(?:R\$)?\s*([\d.]+,\d{2})/gi;

const parseCurrencyValue = (v) => parseFloat(v.replace(/\./g, '').replace(',', '.'));

const lines = [
    "100 1 984 001051750/1 282144 00876 GUSTAVO SANTOS DE ALMEIDA 00 16 R$ 1.444,22 2,00 R$ 28,88",
    "100 1 984 001089679/1 281744 00876 CAROLINA M MOREIRA NEWMAN TARDELL00 10 R$ 1.638,97 3,00 R$ 49,17",
];

lines.forEach(line => {
    regex.lastIndex = 0;
    const match = regex.exec(line);
    if (match) {
        console.log(`MATCH: Contrato: ${match[1]}, Nome: ${match[5]}, Parc: ${match[7]}, Vl: ${match[8]}, Com: ${match[9]}`);
    } else {
        console.log(`FAIL: ${line}`);
    }
});
