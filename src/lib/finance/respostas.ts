import { monthLabel } from '../dates';
import type { Debt, ModoLongevidade } from '../db/schemas';
import { formatBRL, formatBRLSigned } from '../money';
import { jurosTotais, mesesRestantes, mesTermino } from './dividas';
import { LIMITE_LONGEVIDADE, contribuicaoMensal, custoExtraSubir, proximaJanela, regraLongevidade } from './longevidade';
import { statusTeto } from './tetos';

export type Resposta = {
  /** Resposta curta (pode ser vazia). */
  veredito: string;
  tom: 'pos' | 'neg' | 'warn' | 'neutro';
  fatos: string[];
  estimativas: string[];
};

const fmt = (v: number) => formatBRL(v);

/** "Posso gastar R$ X?" — compara com a previsão e com a regra do −500. */
export function podeGastar(p: { valor: number; resultadoAtual: number; previsao: number }): Resposta {
  const depois = p.previsao - p.valor;
  const folga = p.previsao - LIMITE_LONGEVIDADE;
  const fatos = [`Resultado até hoje: ${formatBRLSigned(p.resultadoAtual)}.`];
  const estimativas = [
    `Previsão de fechamento: ${formatBRLSigned(p.previsao)}.`,
    `Com esse gasto: ${formatBRLSigned(depois)}.`,
    folga > 0 ? `Folga até −R$ 500: ${fmt(folga)}.` : `A previsão já está abaixo de −R$ 500.`,
  ];
  if (depois >= 0) return { veredito: `Sim. Cabe e o mês continua positivo.`, tom: 'pos', fatos, estimativas };
  if (depois >= LIMITE_LONGEVIDADE)
    return { veredito: 'Cabe, mas aperta: fica dentro da regra do −R$ 500.', tom: 'warn', fatos, estimativas };
  return { veredito: 'Melhor não: a previsão passa de −R$ 500.', tom: 'neg', fatos, estimativas };
}

/** "Quanto falta para quitar cada dívida?" */
export function quantoFalta(dividas: readonly Debt[], ultimoMesAplicado: string): Resposta {
  const ativas = dividas.filter((d) => d.ativo && d.saldo > 0);
  if (ativas.length === 0) return { veredito: 'Nenhuma dívida em aberto.', tom: 'pos', fatos: [], estimativas: [] };
  const fatos = ativas.map((d) => `${d.nome}: saldo ${fmt(d.saldo)}, parcela ${fmt(d.parcela)}.`);
  const estimativas = ativas.map((d) => {
    const n = mesesRestantes(d);
    if (!Number.isFinite(n)) return `${d.nome}: a parcela não cobre os juros; não quita assim.`;
    const juros = jurosTotais(d);
    return `${d.nome}: ${n} ${n === 1 ? 'parcela' : 'parcelas'}, termina em ${monthLabel(mesTermino(d, ultimoMesAplicado)!)}${juros > 0 ? `, ${fmt(juros)} de juros até lá` : ''}.`;
  });
  const total = ativas.reduce((a, d) => a + d.saldo, 0);
  return { veredito: `Total devido: ${fmt(total)}.`, tom: 'neutro', fatos, estimativas };
}

/** "Onde estou acima do ritmo?" */
export function acimaDoRitmo(p: {
  gastos: ReadonlyMap<string, number>;
  tetos: Record<string, number>;
  dia: number;
  diasNoMes: number;
}): Resposta {
  const itens = Object.entries(p.tetos)
    .map(([cat, teto]) => ({ cat, st: statusTeto(p.gastos.get(cat) ?? 0, teto, p.dia, p.diasNoMes) }))
    .filter((x) => x.st.acimaDoRitmo || x.st.nivel === 'vermelho')
    .sort((a, b) => b.st.gasto - b.st.ritmo - (a.st.gasto - a.st.ritmo));
  if (Object.keys(p.tetos).length === 0)
    return { veredito: 'Nenhum teto definido. Crie tetos no Controle.', tom: 'neutro', fatos: [], estimativas: [] };
  if (itens.length === 0) return { veredito: 'Tudo dentro do ritmo.', tom: 'pos', fatos: [], estimativas: [] };
  return {
    veredito: `${itens.length} ${itens.length === 1 ? 'categoria acima' : 'categorias acima'} do ritmo.`,
    tom: itens.some((i) => i.st.nivel === 'vermelho') ? 'neg' : 'warn',
    fatos: itens.map(({ cat, st }) =>
      st.nivel === 'vermelho'
        ? `${cat}: ${fmt(st.gasto)} de ${fmt(st.teto)} — estourou em ${fmt(st.gasto - st.teto)}.`
        : `${cat}: ${fmt(st.gasto)}; o ritmo previa ${fmt(st.ritmo)} até hoje (+${fmt(st.gasto - st.ritmo)}).`,
    ),
    estimativas: [],
  };
}

/** "Vale subir o Longevidade na próxima janela?" */
export function valeSubir(p: {
  modo: ModoLongevidade;
  mesAtual: string;
  previsao: number;
  mediaFechados: number | null;
  salarioBase: number;
}): Resposta {
  if (p.modo === '6/6') return { veredito: 'Já está em 6/6.', tom: 'pos', fatos: [], estimativas: [] };
  const janela = monthLabel(proximaJanela(p.mesAtual));
  const custo = custoExtraSubir(p.salarioBase);
  const ganho = contribuicaoMensal('6/6', p.salarioBase) - contribuicaoMensal('2/2', p.salarioBase);
  const fatos = [
    `Subir custa ${fmt(custo)} por mês para você e aumenta o capital em ${fmt(ganho)} por mês.`,
    p.mediaFechados !== null ? `Média dos meses fechados: ${formatBRLSigned(p.mediaFechados)}.` : 'Ainda não há meses fechados.',
  ];
  const estimativas = [`Previsão deste mês: ${formatBRLSigned(p.previsao)}.`];
  const base = p.mediaFechados ?? p.previsao;
  const ok = regraLongevidade(base) === 'subir';
  const okDepois = base - custo >= LIMITE_LONGEVIDADE;
  if (!ok)
    return {
      veredito: `Ainda não. A regra pede resultado a partir de −R$ 500. Próxima janela: ${janela}.`,
      tom: 'neg',
      fatos,
      estimativas,
    };
  if (!okDepois) {
    estimativas.push(`Com o custo extra, o resultado ficaria em ${formatBRLSigned(base - custo)}.`);
    return {
      veredito: `Pela regra, sim, em ${janela}. Mas o custo extra leva o mês para baixo de −R$ 500: atenção.`,
      tom: 'warn',
      fatos,
      estimativas,
    };
  }
  return { veredito: `Sim. Subir para 6/6 em ${janela}.`, tom: 'pos', fatos, estimativas };
}
