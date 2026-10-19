import type { Preco, Radar } from '../../schema/radar';
import { normalizar } from '../busca';
import { mapaPrecos, todosPrecos } from '../precos';

/** Cotação usada para pré-preencher uma calculadora, com a origem para mostrar ao lado do campo. */
export type Cotacao = { valor: number; id: string; nome: string; dataRef: string | null; edicao: string };

/** Como achar um item: ids conhecidos (em ordem de preferência) e, se nenhum vier, uma regra pelo nome/unidade. */
export type Procura = { ids: string[]; regra?: (p: Preco) => boolean };

const temValor = (p: Preco | undefined): p is Preco & { valor: number } =>
  !!p && typeof p.valor === 'number' && Number.isFinite(p.valor);

const contem = (p: Preco, ...termos: string[]) => {
  const t = normalizar(`${p.id} ${p.nome} ${p.nome_curto ?? ''}`);
  return termos.every((x) => t.includes(normalizar(x)));
};
const unidade = (p: Preco, ...us: string[]) => us.some((u) => normalizar(p.unidade ?? '').includes(normalizar(u)));

/**
 * Procura a cotação mais recente: primeiro na edição aberta, depois nas anteriores
 * (do mais novo para o mais antigo). Em cada edição tenta os ids conhecidos e depois a regra.
 */
export function buscarCotacao(radares: Radar[], procura: Procura): Cotacao | null {
  for (const r of radares) {
    const m = mapaPrecos(r);
    let p: Preco | undefined = procura.ids.map((id) => m.get(id)).find(temValor);
    if (!p && procura.regra) p = todosPrecos(r).find((x) => temValor(x) && procura.regra!(x));
    if (temValor(p)) return { valor: p.valor, id: p.id, nome: p.nome, dataRef: p.data_ref ?? null, edicao: r.edicao.data };
  }
  return null;
}

export type Produto = 'soja' | 'milho' | 'trigo';
export const PRODUTOS: { id: Produto; nome: string }[] = [
  { id: 'soja', nome: 'Soja' },
  { id: 'milho', nome: 'Milho' },
  { id: 'trigo', nome: 'Trigo' },
];

const SIGLA: Record<Produto, string> = { soja: 'SOJA', milho: 'MILHO', trigo: 'TRIGO' };

/** Chicago (US$/bushel) de cada produto. */
export const procuraBushel = (g: Produto): Procura => ({
  ids: [`${SIGLA[g]}_CBOT`, `${SIGLA[g]}_CHICAGO`],
  regra: (p) => contem(p, g) && unidade(p, 'bu') && (p.regiao === 'chicago' || contem(p, 'chicago') || contem(p, 'cbot')),
});

/** Saca de 60 kg (R$) de cada produto: Cepea/Paranaguá primeiro, depois praças regionais. */
export const procuraSaca = (g: Produto): Procura => ({
  ids: [`${SIGLA[g]}_PGUA`, `${SIGLA[g]}_CEPEA`, `${SIGLA[g]}_PARANAGUA`, `GPV_${SIGLA[g]}`],
  regra: (p) => contem(p, g) && unidade(p, 'sc', 'saca'),
});

export const PROCURA_DOLAR: Procura = {
  ids: ['USDBRL', 'USD_BRL', 'DOLAR', 'USDBRL_COM'],
  regra: (p) => (p.grupo ?? '').startsWith('moedas') && contem(p, 'dolar') && !contem(p, 'turismo'),
};

export const PROCURA_ARROBA: Procura = {
  ids: ['BOI_CEPEA', 'BOI_GORDO_CEPEA', 'NWP_BOI_VISTA', 'GPV_BOI'],
  regra: (p) => contem(p, 'boi') && unidade(p, '@', 'arroba'),
};

export const PROCURA_CDI: Procura = { ids: ['CDI'] };
export const PROCURA_SELIC: Procura = { ids: ['SELIC'] };
export const PROCURA_IPCA: Procura = { ids: ['IPCA12M'] };
export const PROCURA_TESOURO_IPCA: Procura = { ids: [], regra: (p) => p.id.startsWith('TESOURO_IPCA_') };
export const PROCURA_PRE: Procura = { ids: ['DI1F29'], regra: (p) => p.id.startsWith('TESOURO_PRE_') };

/** Edições do mais novo para o mais antigo, começando pela aberta (sem olhar edições futuras a ela). */
export function radaresAte(atual: Radar, todos: Radar[]): Radar[] {
  const data = atual.edicao.data;
  const anteriores = todos.filter((r) => r.edicao.data < data).sort((a, b) => b.edicao.data.localeCompare(a.edicao.data));
  return [atual, ...anteriores];
}
