import { calcularParcelaDaVigencia } from './src/utils/helpers.js';
console.log(calcularParcelaDaVigencia("30/01/2026", "2026-02-30"));
console.log(calcularParcelaDaVigencia("30/01/2026", "2026-02-28"));
console.log(calcularParcelaDaVigencia("01/01/2026", "2026-02-30"));
