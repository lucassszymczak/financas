import type { Preco } from '../schema/radar';
import { casaId, type GrupoWatch } from './config';

export type GrupoMontado = { nome: string; itens: Preco[]; ausentes: string[] };

/**
 * Cruza a watchlist com os preços do dia, na ordem configurada.
 * Ids com curinga ("TESOURO_PRE_*") trazem todos os títulos que casarem.
 */
export function montarWatchlist(grupos: GrupoWatch[], precos: Map<string, Preco>): GrupoMontado[] {
  const todos = [...precos.values()];
  return grupos
    .map((g) => {
      const itens: Preco[] = [];
      const ausentes: string[] = [];
      for (const w of g.itens) {
        if (!w.ativo) continue;
        const achados = w.id.endsWith('*') ? todos.filter((p) => casaId(w.id, p.id)) : [precos.get(w.id)].filter((p) => !!p);
        if (achados.length) itens.push(...achados.filter((p) => !itens.includes(p)));
        else ausentes.push(w.id);
      }
      return { nome: g.nome, itens, ausentes };
    })
    .filter((g) => g.itens.length || g.ausentes.length);
}
