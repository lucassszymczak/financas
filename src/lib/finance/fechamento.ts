import { monthLabel } from '../dates';
import type { ModoLongevidade, Transaction } from '../db/schemas';
import { formatBRL, formatBRLSigned } from '../money';
import { resultadoMes, totaisPorCategoria } from './resultado';
import { vereditoLongevidade } from './veredito';

export type Desvio = {
  categoria: string;
  atual: number;
  referencia: number;
  diferenca: number;
  base: 'mes_anterior' | 'teto';
};

type Tx = Pick<Transaction, 'tipo' | 'valor' | 'categoria'>;

/** Maiores desvios das saídas em relação ao mês anterior ou ao teto (o maior dos dois por categoria). */
export function maioresDesvios(atual: readonly Tx[], anterior: readonly Tx[], tetos: Record<string, number>, n = 3): Desvio[] {
  const a = new Map(totaisPorCategoria(atual, 'saida').map((c) => [c.categoria, c.total]));
  const p = new Map(totaisPorCategoria(anterior, 'saida').map((c) => [c.categoria, c.total]));
  const cats = new Set([...a.keys(), ...p.keys()]);
  const out: Desvio[] = [];
  for (const categoria of cats) {
    const valor = a.get(categoria) ?? 0;
    const ant = p.get(categoria) ?? 0;
    const teto = tetos[categoria];
    const vsAnterior: Desvio = { categoria, atual: valor, referencia: ant, diferenca: valor - ant, base: 'mes_anterior' };
    const vsTeto: Desvio | null = teto
      ? { categoria, atual: valor, referencia: teto, diferenca: valor - teto, base: 'teto' }
      : null;
    const melhor = vsTeto && vsTeto.diferenca > vsAnterior.diferenca ? vsTeto : vsAnterior;
    if (melhor.diferenca > 0) out.push(melhor);
  }
  return out.sort((x, y) => y.diferenca - x.diferenca).slice(0, n);
}

/** Arredonda para cima em múltiplos de R$ 50. */
function arredondar50(c: number): number {
  return Math.ceil(c / 5_000) * 5_000;
}

/** Uma ação sugerida por regra simples, a partir do maior desvio. */
export function acaoSugerida(desvios: readonly Desvio[], tetos: Record<string, number>): string {
  const d = desvios[0];
  if (!d) return 'Nenhuma categoria subiu. Manter o ritmo.';
  const teto = tetos[d.categoria];
  if (!teto) {
    return `Criar teto para ${d.categoria}: sugestão de ${formatBRL(arredondar50(d.referencia || d.atual), { semCentavos: true })} por mês.`;
  }
  if (d.atual > teto) {
    return `${d.categoria} estourou o teto (${formatBRL(d.atual, { semCentavos: true })} de ${formatBRL(teto, { semCentavos: true })}). Cortar no próximo mês ou ajustar o teto para ${formatBRL(arredondar50(d.atual), { semCentavos: true })}.`;
  }
  return `Acompanhar ${d.categoria}: subiu ${formatBRL(d.diferenca, { semCentavos: true })} em relação ao mês anterior.`;
}

/** Texto do fechamento do mês (template). */
export function gerarFechamento(params: {
  mes: string;
  txs: readonly Tx[];
  txsAnterior: readonly Tx[];
  tetos: Record<string, number>;
  modo: ModoLongevidade;
}): string {
  const r = resultadoMes(params.txs);
  const v = vereditoLongevidade({ valor: r.resultado, estimativa: false, modo: params.modo, mes: params.mes });
  const desvios = maioresDesvios(params.txs, params.txsAnterior, params.tetos);
  const linhas = [
    `Fechamento de ${monthLabel(params.mes)}`,
    '',
    `Resultado: ${formatBRLSigned(r.resultado)} (entradas ${formatBRL(r.entradas)}, saídas ${formatBRL(r.saidas)}).`,
    `Regra do Longevidade: ${v.titulo}. ${v.detalhe}`,
    '',
    'Maiores desvios:',
    ...(desvios.length
      ? desvios.map(
          (d, i) =>
            `${i + 1}. ${d.categoria}: ${formatBRL(d.atual)} (${d.base === 'teto' ? 'teto' : 'mês anterior'} ${formatBRL(d.referencia)}, +${formatBRL(d.diferenca)}).`,
        )
      : ['Nenhum.']),
    '',
    `Ação sugerida: ${acaoSugerida(desvios, params.tetos)}`,
  ];
  return linhas.join('\n');
}
