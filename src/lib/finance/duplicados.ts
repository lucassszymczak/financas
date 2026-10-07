import { diffDays } from '../dates';
import type { Transaction } from '../db/schemas';

type Tx = Pick<Transaction, 'valor' | 'data'>;

/** Mesmo valor (±R$ 0,01) e datas a até 2 dias de distância. */
export function ehDuplicado(a: Tx, b: Tx): boolean {
  return Math.abs(a.valor - b.valor) <= 1 && Math.abs(diffDays(a.data, b.data)) <= 2;
}

/**
 * Para cada candidato, indica se é possível duplicado de um lançamento existente
 * ou de um candidato anterior no mesmo lote.
 */
export function marcarDuplicados(candidatos: readonly Tx[], existentes: readonly Tx[]): boolean[] {
  return candidatos.map((c, i) => existentes.some((e) => ehDuplicado(c, e)) || candidatos.slice(0, i).some((p) => ehDuplicado(c, p)));
}
