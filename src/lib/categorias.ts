import type { Preco, Radar } from '../schema/radar';
import { normalizar } from './busca';
import { todosPrecos } from './precos';

/** Categorias do menu (Mercado e Renda fixa), definidas pelo campo `grupo` de cada cotação. */
export type Categoria = { id: string; nome: string; area: 'mercado' | 'renda-fixa'; filtro: (g: string) => boolean };

export const CATEGORIAS: Categoria[] = [
  { id: 'acoes', nome: 'Ações', area: 'mercado', filtro: (g) => g.startsWith('acoes') },
  { id: 'indices_br', nome: 'Índices Brasil', area: 'mercado', filtro: (g) => g === 'indices_br' || g === 'indices_setoriais' },
  { id: 'indices_mundo', nome: 'Índices globais', area: 'mercado', filtro: (g) => g === 'indices_mundo' },
  { id: 'moedas', nome: 'Moedas', area: 'mercado', filtro: (g) => g.startsWith('moedas') },
  { id: 'commodities', nome: 'Commodities', area: 'mercado', filtro: (g) => g.startsWith('commodities') },
  { id: 'fiis', nome: 'Fundos imobiliários', area: 'mercado', filtro: (g) => g === 'fiis' },
  { id: 'cripto', nome: 'Cripto', area: 'mercado', filtro: (g) => g === 'cripto' },
  { id: 'di', nome: 'Curva DI', area: 'renda-fixa', filtro: (g) => g === 'juros_br' || g === 'curva_di' },
  { id: 'tesouro', nome: 'Tesouro Direto', area: 'renda-fixa', filtro: (g) => g === 'tesouro' || g === 'renda_fixa' },
  { id: 'juros_mundo', nome: 'Juros no mundo', area: 'renda-fixa', filtro: (g) => g === 'juros_mundo' },
];

export const categoria = (id: string | null | undefined) => CATEGORIAS.find((c) => c.id === id);

export function itensCategoria(r: Radar, id: string): Preco[] {
  const c = categoria(id);
  return c ? todosPrecos(r).filter((p) => c.filtro(p.grupo ?? '')) : [];
}

export const ehAcao = (p: Preco) => (p.grupo ?? '').startsWith('acoes');

/**
 * Setor B3 das ações do Ibovespa, usado quando o arquivo não traz o campo `setor`.
 * O setor que vier no arquivo sempre tem prioridade.
 */
const SETOR_PADRAO: Record<string, string> = {};
const preencher = (setor: string, ids: string) => ids.split(' ').forEach((id) => (SETOR_PADRAO[id] = setor));
preencher('Financeiro', 'B3SA3 BBAS3 BBDC3 BBDC4 BBSE3 BPAC11 CXSE3 IRBR3 ITSA4 ITUB4 PSSA3 SANB11 IGTI11 MULT3 ALOS3');
preencher('Materiais básicos', 'VALE3 BRAP4 BRKM5 CMIN3 CSNA3 GGBR4 GOAU4 KLBN11 SUZB3 USIM5');
preencher('Petróleo, gás e biocombustíveis', 'PETR3 PETR4 PRIO3 BRAV3 CSAN3 RAIZ4 UGPA3 VBBR3');
preencher('Utilidade pública', 'AURE3 AXIA3 AXIA6 ELET3 ELET6 CMIG4 CPFE3 CPLE3 EGIE3 ENEV3 ENGI11 EQTL3 ISAE4 SBSP3 TAEE11');
preencher('Consumo cíclico', 'AZZA3 CEAB3 COGN3 CURY3 CYRE3 DIRR3 LREN3 MGLU3 MRVE3 RENT3 TEND3 VIVA3 YDUQ3 SMFT3 VAMO3');
preencher('Consumo não cíclico', 'ABEV3 ASAI3 BEEF3 JBSS3 MBRF3 NATU3 SLCE3 SMTO3 AGRO3 TTEN3 PCAR3 CRFB3');
preencher('Bens industriais', 'EMBJ3 EMBR3 MOTV3 POMO4 RAIL3 STBP3 WEGE3 AZUL4');
preencher('Saúde', 'FLRY3 HAPV3 HYPE3 RADL3 RDOR3');
preencher('Comunicações', 'TIMS3 VIVT3');
preencher('Tecnologia da informação', 'TOTS3');

export function setorDe(p: Preco): string | null {
  return p.setor?.trim() || SETOR_PADRAO[p.id] || null;
}

/** Número da variação para média e ordenação: % ou, para juros, pb convertidos em pontos percentuais. */
export function variacaoNumero(p: { variacao_pct?: number | null; variacao_pb?: number | null }): number | null {
  if (p.variacao_pct !== null && p.variacao_pct !== undefined && Number.isFinite(p.variacao_pct)) return p.variacao_pct;
  if (p.variacao_pb !== null && p.variacao_pb !== undefined && Number.isFinite(p.variacao_pb)) return p.variacao_pb / 100;
  return null;
}

/** Média simples das variações (ignora quem veio sem variação); null se ninguém tiver. */
export function mediaSimples(itens: Preco[]): number | null {
  const v = itens.map(variacaoNumero).filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export type ResumoSetor = { setor: string; itens: Preco[]; media: number | null; altas: number; baixas: number };

/** Agrupa as ações por setor B3, com a variação média simples e a contagem de altas e baixas. */
export function agruparSetores(precos: Preco[]): ResumoSetor[] {
  const m = new Map<string, Preco[]>();
  for (const p of precos) {
    if (!ehAcao(p)) continue;
    const s = setorDe(p);
    if (!s) continue;
    const l = m.get(s);
    if (l) l.push(p);
    else m.set(s, [p]);
  }
  return [...m.entries()]
    .map(([setor, itens]) => ({
      setor,
      itens,
      media: mediaSimples(itens),
      altas: itens.filter((p) => (variacaoNumero(p) ?? 0) > 0).length,
      baixas: itens.filter((p) => (variacaoNumero(p) ?? 0) < 0).length,
    }))
    .sort((a, b) => a.setor.localeCompare(b.setor, 'pt-BR'));
}

const cacheSetores = new WeakMap<Radar, ResumoSetor[]>();
export function setoresDoRadar(r: Radar): ResumoSetor[] {
  let s = cacheSetores.get(r);
  if (!s) {
    s = agruparSetores(todosPrecos(r));
    cacheSetores.set(r, s);
  }
  return s;
}

export function buscarSetores(r: Radar, termo: string): ResumoSetor[] {
  const t = normalizar(termo);
  return t ? setoresDoRadar(r).filter((s) => normalizar(s.setor).includes(t)) : [];
}

/** Intensidade do tingido do cartão de setor: cresce com a variação, até 0,32. */
export function opacidadeSetor(media: number | null): number {
  if (media === null) return 0;
  return Math.min(0.32, Math.abs(media) / 7 + 0.05);
}

/** Opções do seletor "Fita:". `setor:<nome>` filtra as ações de um setor. */
export type OpcaoFita = { valor: string; nome: string; grupo: 'Geral' | 'Setores' | 'Outros' };

export function opcoesFita(r: Radar): OpcaoFita[] {
  return [
    { valor: 'principais', nome: 'Principais', grupo: 'Geral' },
    { valor: 'indices', nome: 'Índices', grupo: 'Geral' },
    { valor: 'acoes', nome: 'Todas as ações', grupo: 'Geral' },
    ...setoresDoRadar(r).map((s) => ({ valor: `setor:${s.setor}`, nome: s.setor, grupo: 'Setores' as const })),
    { valor: 'moedas', nome: 'Moedas', grupo: 'Outros' },
    { valor: 'juros', nome: 'Juros e Tesouro', grupo: 'Outros' },
    { valor: 'commodities', nome: 'Commodities', grupo: 'Outros' },
    { valor: 'agro', nome: 'Agro', grupo: 'Outros' },
  ];
}

/** Ativos que a fita mostra para a opção escolhida. "Principais" é o Radar curado (cotações + agro de Chicago e Brasil). */
export function itensFita(r: Radar, opcao: string): Preco[] {
  const todos = todosPrecos(r);
  const por = (...ids: string[]) => todos.filter((p) => ids.some((id) => categoria(id)!.filtro(p.grupo ?? '')));
  if (opcao.startsWith('setor:')) {
    const s = opcao.slice(6);
    return todos.filter((p) => ehAcao(p) && setorDe(p) === s);
  }
  switch (opcao) {
    case 'indices':
      return por('indices_br', 'indices_mundo');
    case 'acoes':
      return por('acoes');
    case 'moedas':
      return por('moedas');
    case 'juros':
      return por('di', 'tesouro', 'juros_mundo');
    case 'commodities':
      return por('commodities');
    case 'agro':
      return r.agro;
    default:
      return [...r.cotacoes, ...r.agro.filter((a) => a.regiao === 'chicago' || a.regiao === 'brasil')];
  }
}
