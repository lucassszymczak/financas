import type { Transaction } from '../db/schemas';
import { chaveEstabelecimento } from './chave';

export type Recorrencia = {
  chave: string;
  nome: string;
  categoria: string;
  meses: string[];
  media: number;
  custoAnual: number;
};

/**
 * Saídas não fixas com a mesma chave em 2 meses ou mais e valores mensais
 * dentro de ±15% da média.
 */
export function detectarRecorrencias(
  txs: readonly Pick<Transaction, 'tipo' | 'fixoId' | 'estabelecimento' | 'descricao' | 'mes' | 'valor' | 'categoria'>[],
): Recorrencia[] {
  const grupos = new Map<string, { nome: string; categoria: string; porMes: Map<string, number> }>();
  for (const t of txs) {
    if (t.tipo !== 'saida' || t.fixoId) continue;
    const nome = t.estabelecimento || t.descricao;
    const chave = chaveEstabelecimento(nome);
    if (!chave) continue;
    let g = grupos.get(chave);
    if (!g) {
      g = { nome, categoria: t.categoria, porMes: new Map() };
      grupos.set(chave, g);
    }
    g.porMes.set(t.mes, (g.porMes.get(t.mes) ?? 0) + t.valor);
  }

  const out: Recorrencia[] = [];
  for (const [chave, g] of grupos) {
    if (g.porMes.size < 2) continue;
    const valores = [...g.porMes.values()];
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    if (!valores.every((v) => Math.abs(v - media) <= media * 0.15)) continue;
    const m = Math.round(media);
    out.push({
      chave,
      nome: g.nome,
      categoria: g.categoria,
      meses: [...g.porMes.keys()].sort(),
      media: m,
      custoAnual: m * 12,
    });
  }
  return out.sort((a, b) => b.custoAnual - a.custoAnual);
}
