import type { Preco, Radar } from '../schema/radar';
import { humanizar } from './formato';

export const GRUPO_TAXAS = 'taxas_referencia';

/** Selic, CDI e IPCA viram itens de preço com ids fixos, para aparecer no Mercado e na watchlist. */
export function taxasComoPrecos(r: Radar): Preco[] {
  const t = r.taxas_referencia;
  if (!t) return [];
  const base = { grupo: GRUPO_TAXAS, unidade: '% a.a.', data_ref: null, fonte: 'Taxas de referência do arquivo' };
  return [
    { ...base, id: 'SELIC', nome: 'Selic meta', valor: t.selic_meta ?? null },
    { ...base, id: 'CDI', nome: 'CDI', valor: t.cdi_anual ?? null },
    { ...base, id: 'IPCA12M', nome: 'IPCA 12 meses', valor: t.ipca_12m ?? null, unidade: '%' },
  ];
}

/** Itens do bloco de cotações amplas, já com data, fonte e nome herdados do bloco. Ids do Radar curado têm prioridade. */
export function cotacoesAmplas(r: Radar): Preco[] {
  const b = r.cotacoes_amplas;
  if (!b) return [];
  const curados = new Set([...r.cotacoes, ...r.agro].map((c) => c.id));
  return b.itens
    .filter((i) => !curados.has(i.id))
    .map((i) => ({
      ...i,
      nome: i.nome ?? i.id,
      data_ref: i.data_ref ?? b.data_ref ?? null,
      fonte: i.fonte ?? b.fonte ?? null,
      url: i.url ?? b.url ?? null,
      nota_fonte: i.nota_fonte ?? b.nota_fonte ?? null,
      kpi: false,
    }));
}

/** Itens curados do Radar (cotações, agro e taxas): os que entram no ticker, KPIs e resumo de dado antigo. */
export function precosCurados(r: Radar): Preco[] {
  return [...r.cotacoes, ...r.agro, ...taxasComoPrecos(r)];
}

const cacheTodos = new WeakMap<Radar, Preco[]>();
const cacheMapa = new WeakMap<Radar, Map<string, Preco>>();

/** Todos os itens com preço de uma edição (curados + cotações amplas). */
export function todosPrecos(r: Radar): Preco[] {
  let t = cacheTodos.get(r);
  if (!t) {
    t = [...precosCurados(r), ...cotacoesAmplas(r)];
    cacheTodos.set(r, t);
  }
  return t;
}

export function mapaPrecos(r: Radar): Map<string, Preco> {
  let m = cacheMapa.get(r);
  if (!m) {
    m = new Map(todosPrecos(r).map((p) => [p.id, p]));
    cacheMapa.set(r, m);
  }
  return m;
}

/** Juros são exibidos em pb e têm a cor neutra no ticker. */
export function ehJuros(p: Preco): boolean {
  return p.variacao_pb !== null && p.variacao_pb !== undefined;
}

export const NOMES_GRUPOS: Record<string, string> = {
  indices_br: 'Índices Brasil',
  indices_mundo: 'Índices globais',
  moedas: 'Moedas',
  juros_br: 'Juros Brasil',
  juros_mundo: 'Juros no mundo',
  commodities: 'Commodities',
  acoes_bluechips: 'Ações blue chips',
  acoes_agro: 'Ações agro e proteína',
  renda_fixa: 'Renda fixa',
  acoes_ibov: 'Ações do Ibovespa',
  acoes_outras: 'Outras ações',
  indices_setoriais: 'Índices setoriais B3',
  fiis: 'Fundos imobiliários',
  bdrs: 'BDRs',
  etfs: 'ETFs',
  moedas_mundo: 'Moedas no mundo',
  cripto: 'Criptoativos',
  curva_di: 'Curva de juros (DI)',
  tesouro: 'Tesouro Direto',
  commodities_agricolas: 'Commodities agrícolas',
  commodities_metais: 'Metais',
  commodities_energia: 'Energia',
  [GRUPO_TAXAS]: 'Taxas de referência',
};

export const NOMES_REGIOES: Record<string, string> = {
  chicago: 'Chicago (CBOT)',
  brasil: 'Brasil',
  guarapuava: 'Guarapuava (PR)',
  noroeste_paulista: 'Noroeste Paulista',
};

export const nomeGrupo = (g: string) => NOMES_GRUPOS[g] ?? humanizar(g);
export const nomeRegiao = (g: string) => NOMES_REGIOES[g] ?? humanizar(g);

/** Agrupa preservando a ordem de primeira aparição. */
export function agrupar<T>(itens: T[], chave: (t: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const i of itens) {
    const k = chave(i);
    const lista = m.get(k);
    if (lista) lista.push(i);
    else m.set(k, [i]);
  }
  return [...m.entries()];
}

/** Leitura de seção: tenta a chave exata e variações comuns (ex.: "brasil" → "brasil_agro"). */
export function leituraSecao(r: Radar, ...chaves: string[]): string | null {
  const l = r.leituras_secao ?? {};
  for (const k of chaves) {
    for (const c of [k, `${k}_agro`, `agro_${k}`]) {
      const v = l[c];
      if (v) return v;
    }
  }
  return null;
}

export type Ponto = { x: string; y: number };

/**
 * Série histórica de um id a partir das edições salvas (ordenadas ou não).
 * O eixo usa `data_ref` quando existir; se várias edições trazem a mesma data, vale a mais recente.
 */
export function serie(edicoes: Radar[], id: string): Ponto[] {
  const ordenadas = [...edicoes].sort((a, b) => a.edicao.data.localeCompare(b.edicao.data));
  const porData = new Map<string, number>();
  for (const r of ordenadas) {
    const p = mapaPrecos(r).get(id);
    if (!p || p.valor === null || p.valor === undefined) continue;
    porData.set(p.data_ref ?? r.edicao.data, p.valor);
  }
  return [...porData.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([x, y]) => ({ x, y }));
}
