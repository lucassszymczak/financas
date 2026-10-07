import type { Tipo, Transaction } from '../db/schemas';

type Tx = Pick<Transaction, 'tipo' | 'valor'>;

export type TotaisPorTipo = Record<Tipo, number>;

export function totaisPorTipo(txs: readonly Tx[]): TotaisPorTipo {
  const t: TotaisPorTipo = { saida: 0, entrada: 0, trabalho: 0, extra_in: 0, extra_out: 0 };
  for (const x of txs) t[x.tipo] += x.valor;
  return t;
}

/** Resultado do mês = entradas − saídas. Trabalho e extraordinários ficam fora. */
export function resultadoMes(txs: readonly Tx[]): { entradas: number; saidas: number; resultado: number } {
  const t = totaisPorTipo(txs);
  return { entradas: t.entrada, saidas: t.saida, resultado: t.entrada - t.saida };
}

/** Soma por categoria para um tipo, em ordem decrescente. */
export function totaisPorCategoria(
  txs: readonly Pick<Transaction, 'tipo' | 'valor' | 'categoria'>[],
  tipo: Tipo,
): { categoria: string; total: number }[] {
  const map = new Map<string, number>();
  for (const x of txs) if (x.tipo === tipo) map.set(x.categoria, (map.get(x.categoria) ?? 0) + x.valor);
  return [...map.entries()].map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
}

/** Média do resultado dos meses informados (centavos, arredondada). */
export function mediaResultados(resultados: readonly number[]): number | null {
  if (resultados.length === 0) return null;
  return Math.round(resultados.reduce((a, b) => a + b, 0) / resultados.length);
}
