import type { Preco, Radar } from '../schema/radar';
import { humanizar } from './formato';
import { normalizar } from './busca';
import { compararEdicoes } from './edicoes';

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
      hora_ref: i.hora_ref ?? b.hora_ref ?? null,
      fonte: i.fonte ?? b.fonte ?? null,
      url: i.url ?? b.url ?? null,
      nota_fonte: i.nota_fonte ?? b.nota_fonte ?? null,
      kpi: false,
    }));
}

/** Itens curados do Radar (cotações, agro e taxas): os que entram na fita "Principais", KPIs e resumo de dado antigo. */
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

/** Valor do meio do pregão: tem `hora_ref` ou vem marcado como "intradiário". */
export function ehIntradiario(p: { hora_ref?: string | null; observacao?: string | null }): boolean {
  return !!p.hora_ref || normalizar(p.observacao ?? '').trim() === 'intradiario';
}

/** Juros são exibidos em pb e têm a cor neutra. */
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

/** Ponto de série: data, valor e, quando o arquivo trouxer, a variação do dia (vp em %, vb em pb). */
export type Ponto = { x: string; y: number; vp?: number; vb?: number };

/**
 * Série histórica de um id a partir das edições salvas (ordenadas ou não).
 * O eixo usa `data_ref` quando existir; se várias edições trazem a mesma data, vale a mais recente.
 * Só entram fechamentos: valores intradiários (com `hora_ref`) ficam fora do histórico.
 */
export function serie(edicoes: Radar[], id: string): Ponto[] {
  const ordenadas = [...edicoes].sort((a, b) => a.edicao.data.localeCompare(b.edicao.data) || compararEdicoes(a, b));
  const porData = new Map<string, Ponto>();
  for (const r of ordenadas) {
    const p = mapaPrecos(r).get(id);
    if (!p || p.valor === null || p.valor === undefined || ehIntradiario(p) || p.herdado) continue;
    const x = p.data_ref ?? r.edicao.data;
    const pt: Ponto = { x, y: p.valor };
    if (typeof p.variacao_pct === 'number') pt.vp = p.variacao_pct;
    if (typeof p.variacao_pb === 'number') pt.vb = p.variacao_pb;
    porData.set(x, pt);
  }
  return [...porData.values()].sort((a, b) => a.x.localeCompare(b.x));
}

/** Valor intradiário do item na edição aberta (fica fora do histórico; o gráfico mostra à parte, tracejado). */
export function pontoIntradiario(r: Radar, id: string): (Ponto & { hora: string | null }) | null {
  const p = mapaPrecos(r).get(id);
  if (!p || p.valor === null || p.valor === undefined || !ehIntradiario(p) || p.herdado) return null;
  const pt: Ponto & { hora: string | null } = { x: p.data_ref ?? r.edicao.data, y: p.valor, hora: p.hora_ref ?? null };
  if (typeof p.variacao_pct === 'number') pt.vp = p.variacao_pct;
  if (typeof p.variacao_pb === 'number') pt.vb = p.variacao_pb;
  return pt;
}
