import assert from "node:assert";
import { test } from "node:test";
import {
  parsePreventCommissionRule,
  calculatePreventValorTotal,
  extractPreventInstallment,
} from "./preventExtractor.js";

test("Rule 1: (vitalício determinado) sets commission to 2%, vitalício to 'Sim', corretor to 'PROTETTA'", () => {
  const result = parsePreventCommissionRule("Parcela 3 de 25 (vitalício determinado)");
  assert.strictEqual(result.comissaoPorcentagem, 2);
  assert.strictEqual(result.vitalicio, "Sim");
  assert.strictEqual(result.parcela, "3");
  assert.strictEqual(result.corretor, "PROTETTA");
  assert.strictEqual(result.vendedor, "PROTETTA");

  const total = calculatePreventValorTotal(36.57, result.comissaoPorcentagem);
  assert.strictEqual(total, 1828.5);
});

test("Rule 2: 'Parcela bónus promocional 50%' sets commission to 50%, parcela to 5, vitalício to 'Não'", () => {
  const result = parsePreventCommissionRule("Parcela bónus promocional 50%");
  assert.strictEqual(result.comissaoPorcentagem, 50);
  assert.strictEqual(result.vitalicio, "Não");
  assert.strictEqual(result.parcela, "5");
  assert.strictEqual(result.corretor, "PROTETTA");
  assert.strictEqual(result.vendedor, "PROTETTA");

  const total = calculatePreventValorTotal(581.3, result.comissaoPorcentagem);
  assert.strictEqual(total, 1162.6);
});

test("Rule 3: 'Parcela extra' sets commission to 50%, parcela to 4, vitalício to 'Não'", () => {
  const result = parsePreventCommissionRule("Parcela extra");
  assert.strictEqual(result.comissaoPorcentagem, 50);
  assert.strictEqual(result.vitalicio, "Não");
  assert.strictEqual(result.parcela, "4");
  assert.strictEqual(result.corretor, "PROTETTA");
  assert.strictEqual(result.vendedor, "PROTETTA");

  const total = calculatePreventValorTotal(914.22, result.comissaoPorcentagem);
  assert.strictEqual(total, 1828.44);
});

test("Rule 4: Standard percentage e.g. '3º Parcela 50%'", () => {
  const result = parsePreventCommissionRule("3º Parcela 50%");
  assert.strictEqual(result.comissaoPorcentagem, 50);
  assert.strictEqual(result.vitalicio, "Não");
  assert.strictEqual(result.parcela, "3");
  assert.strictEqual(result.corretor, "PROTETTA");
});

test("Rule 5: 2% percentage always forces vitalicio = 'Sim'", () => {
  const result = parsePreventCommissionRule("Parcela 4 de 25 2%");
  assert.strictEqual(result.comissaoPorcentagem, 2);
  assert.strictEqual(result.vitalicio, "Sim");
  assert.strictEqual(result.corretor, "PROTETTA");
});

test("Rule 4: All Prevent sales have corretor and vendedor as 'PROTETTA'", () => {
  const r1 = parsePreventCommissionRule("Parcela 1 de 25 (vitalício determinado)");
  const r2 = parsePreventCommissionRule("Qualquer comissao");
  assert.strictEqual(r1.corretor, "PROTETTA");
  assert.strictEqual(r1.vendedor, "PROTETTA");
  assert.strictEqual(r2.corretor, "PROTETTA");
  assert.strictEqual(r2.vendedor, "PROTETTA");
});
