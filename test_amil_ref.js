const blocos = [
    "01/06/2026 - Amil Fácil S60 SP - R$ 250,00",
    "22100 - TESTE CLIENTE Qtd. Total Benef. 3 Qtd. Cart. Benef. 0 Qtd. Vidas 3 1.000,00 500,00 Benef. 313828",
    "22100 - TESTE CLIENTE 12/2026 3 0 3 10,00 1.000,00 500,00 Benef. 313828",
    "22100 - TESTE CLIENTE Qtd. Vidas 4 05/2026 10,00 1.000,00 500,00",
    "22100 - TESTE CLIENTE 10,00 1.000,00 500,00 Médico Referência: 11/2026",
    "01/05/2026 - 1221 - FULANO 50,00 06/2026"
];

for (const bloco of blocos) {
    let matchRefAmil = bloco.match(/(?<!\d\/)\b(\d{2})\/(\d{4})\b/);
    let dataMovimentoDetectada = matchRefAmil ? `${matchRefAmil[2]}-${matchRefAmil[1]}-30` : 'fallback';
    console.log(`bloco: ${bloco} - data: ${dataMovimentoDetectada}`);
}
