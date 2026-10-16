/** Conversões de taxa (decimal) e juros compostos. */
export const mensalParaAnual = (m: number) => (1 + m) ** 12 - 1;
export const anualParaMensal = (a: number) => (1 + a) ** (1 / 12) - 1;

/** Valor futuro com aporte no fim de cada período: P(1+i)^n + A[(1+i)^n − 1]/i. */
export function valorFuturo(inicial: number, aporte: number, taxa: number, periodos: number): number {
  const f = (1 + taxa) ** periodos;
  const parcelas = taxa === 0 ? aporte * periodos : (aporte * (f - 1)) / taxa;
  return inicial * f + parcelas;
}
