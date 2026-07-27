/**
 * Utility module for PREVENT extraction rules.
 */

export function normalizeText(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function extractPreventInstallment(tcNorm, rawTipoComissao) {
  if (tcNorm.includes("parcela bonus promocional 50%") || tcNorm.includes("parcela bonus promocional")) {
    return "5";
  }
  if (tcNorm.includes("parcela extra")) {
    return "4";
  }
  const str = String(rawTipoComissao || "").trim();
  const match =
    str.match(/(\d+)\s*(?:º|ª|o|a)?\s*Parcela/i) ||
    str.match(/Parcela\s+(\d+)/i) ||
    str.match(/^(\d+)\b/);
  return match ? match[1] : "1";
}

export function parsePreventCommissionRule(rawTipoComissao) {
  const tcNorm = normalizeText(rawTipoComissao);

  let comissaoPorcentagem = null;
  let vitalicio = "Não";
  let parcela = extractPreventInstallment(tcNorm, rawTipoComissao);

  // Rule 1: (vitalício determinado) => 2% commission, vitalício = "Sim"
  if (tcNorm.includes("vitalicio determinado")) {
    comissaoPorcentagem = 2;
    vitalicio = "Sim";
  }
  // Rule 2: Parcela bónus promocional 50% => 50% commission, parcela 5
  else if (tcNorm.includes("parcela bonus promocional 50%") || tcNorm.includes("parcela bonus promocional")) {
    comissaoPorcentagem = 50;
    parcela = "5";
    vitalicio = "Não";
  }
  // Rule 3: Parcela extra => 50% commission, parcela 4
  else if (tcNorm.includes("parcela extra")) {
    comissaoPorcentagem = 50;
    parcela = "4";
    vitalicio = "Não";
  }
  // Check for other percentage occurrences (e.g. "2º Parcela 50%")
  else {
    const pctMatch = tcNorm.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (pctMatch) {
      comissaoPorcentagem = parseFloat(pctMatch[1].replace(",", "."));
    }
    if (tcNorm.includes("vitalicio")) {
      vitalicio = "Sim";
    }
  }

  if (comissaoPorcentagem === 2) {
    vitalicio = "Sim";
  }

  return {
    comissaoPorcentagem,
    vitalicio,
    parcela,
    corretor: "PROTETTA",
    vendedor: "PROTETTA",
  };
}

export function calculatePreventValorTotal(valorComissao, comissaoPorcentagem) {
  const absComissao = Math.abs(valorComissao || 0);
  if (absComissao > 0 && comissaoPorcentagem && comissaoPorcentagem > 0) {
    return parseFloat((absComissao / (comissaoPorcentagem / 100)).toFixed(2));
  }
  return absComissao;
}
