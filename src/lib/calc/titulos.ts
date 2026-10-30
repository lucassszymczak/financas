import { aliquotaIR } from './ir';

/** Inflação implícita (break-even): (1 + pré) / (1 + juro real) − 1. Taxas em decimal. */
export const inflacaoImplicita = (pre: number, real: number) => (1 + pre) / (1 + real) - 1;

export type Alternativa = { nome: string; bruto: number; ir: number; liquido: number };

/**
 * Prefixado x IPCA+ x pós-fixado no mesmo prazo, com IR regressivo sobre o ganho.
 * O IPCA+ e o pós usam as premissas do usuário (inflação e CDI médios esperados).
 */
export function compararTitulos(o: {
  valor: number;
  anos: number;
  pre: number;
  real: number;
  inflacaoEsperada: number;
  cdiEsperado: number;
  pctCdi: number;
  descontarIR: boolean;
}): { implicita: number; alternativas: Alternativa[]; melhor: string } {
  const aliquota = o.descontarIR ? aliquotaIR(Math.round(o.anos * 365)) : 0;
  const montar = (nome: string, fator: number): Alternativa => {
    const bruto = o.valor * fator;
    const ir = (bruto - o.valor) * aliquota;
    return { nome, bruto, ir: Math.max(0, ir), liquido: bruto - Math.max(0, ir) };
  };
  const posAnual = ((1 + o.cdiEsperado) ** (1 / 252) - 1) * o.pctCdi;
  const alternativas = [
    montar('Prefixado', (1 + o.pre) ** o.anos),
    montar('IPCA+', ((1 + o.real) * (1 + o.inflacaoEsperada)) ** o.anos),
    montar('Pós-fixado (CDI)', (1 + posAnual) ** (252 * o.anos)),
  ];
  const melhor = [...alternativas].sort((a, b) => b.liquido - a.liquido)[0]!.nome;
  return { implicita: inflacaoImplicita(o.pre, o.real), alternativas, melhor };
}
