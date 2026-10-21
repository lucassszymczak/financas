import { aliquotaIR, diasUteis } from './ir';

/** Fator de um título pós-fixado que paga `pct` do CDI por `du` dias úteis (taxas em decimal). */
export function fatorCdi(cdiAnual: number, pct: number, du: number): number {
  const diario = (1 + cdiAnual) ** (1 / 252) - 1;
  return (1 + diario * pct) ** du;
}

export type ComparacaoCdbLca = {
  du: number;
  aliquota: number;
  cdb: { bruto: number; ir: number; liquido: number; rendimento: number };
  lca: { liquido: number; rendimento: number };
  /** % do CDI que um CDB precisaria pagar para empatar com a LCA (em decimal). */
  cdbEquivalente: number;
  vencedor: 'cdb' | 'lca' | 'empate';
};

/**
 * CDB/RDC (tributado) x LCA/LCI (isenta para pessoa física).
 * Percentuais e CDI em decimal: 1,05 = 105% do CDI; 0,149 = 14,9% a.a.
 */
export function compararCdbLca(o: {
  valor: number;
  dias: number;
  pctCdb: number;
  pctLca: number;
  cdiAnual: number;
}): ComparacaoCdbLca {
  const du = diasUteis(o.dias);
  const aliquota = aliquotaIR(o.dias);
  const bruto = o.valor * fatorCdi(o.cdiAnual, o.pctCdb, du);
  const ir = (bruto - o.valor) * aliquota;
  const liquidoCdb = bruto - ir;
  const liquidoLca = o.valor * fatorCdi(o.cdiAnual, o.pctLca, du);

  // Busca binária: % do CDI do CDB cujo líquido iguala o da LCA.
  const alvo = liquidoLca - o.valor;
  let lo = 0;
  let hi = 10;
  for (let i = 0; i < 80; i++) {
    const meio = (lo + hi) / 2;
    const ganho = (o.valor * fatorCdi(o.cdiAnual, meio, du) - o.valor) * (1 - aliquota);
    if (ganho < alvo) lo = meio;
    else hi = meio;
  }
  const dif = liquidoCdb - liquidoLca;
  return {
    du,
    aliquota,
    cdb: { bruto, ir, liquido: liquidoCdb, rendimento: liquidoCdb - o.valor },
    lca: { liquido: liquidoLca, rendimento: liquidoLca - o.valor },
    cdbEquivalente: (lo + hi) / 2,
    vencedor: Math.abs(dif) < 0.005 ? 'empate' : dif > 0 ? 'cdb' : 'lca',
  };
}
