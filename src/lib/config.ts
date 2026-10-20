export type Tema = 'sistema' | 'claro' | 'escuro';

export type ItemWatch = { id: string; ativo: boolean };
export type GrupoWatch = { nome: string; itens: ItemWatch[] };
export type Limite = { id: string; tipo: 'acima' | 'abaixo'; valor: number; ativo: boolean };

export type Config = {
  nomeApp: string;
  corDestaque: string;
  tema: Tema;
  /** Logos de empresas e bandeiras ao lado dos ativos. */
  mostrarLogos: boolean;
  watchlist: GrupoWatch[];
  limites: Limite[];
  /** Quando a configuração mudou pela última vez (a sincronização fica com a mais nova). */
  atualizadaEm?: string;
  /** Versão da lista padrão já aplicada (para acrescentar grupos novos a quem já usa o app). */
  versaoLista?: number;
};

/** navy-900 do manual da marca Oracle Capital. */
export const COR_PADRAO = '#14213D';
/** Padrão antigo (verde), trocado pelo navy da marca para quem nunca mudou a cor. */
const COR_PADRAO_ANTIGA = '#005C46';
export const LARANJA = '#F58220';

const grupo = (nome: string, ids: string[]): GrupoWatch => ({ nome, itens: ids.map((id) => ({ id, ativo: true })) });

/**
 * Carteira de referência do Ibovespa (vigência set–dez/2026: entrou TEND3; saíram RECV3 e SLCE3).
 * A regra "grupo:acoes_ibov" traz automaticamente tudo o que a rotina enviar como ação do Ibovespa,
 * então rebalanceamentos futuros aparecem sem editar esta lista.
 */
export const IBOVESPA_REFERENCIA = [
  'ALOS3',
  'ABEV3',
  'ASAI3',
  'AURE3',
  'AXIA3',
  'AXIA6',
  'AZZA3',
  'B3SA3',
  'BBAS3',
  'BBDC3',
  'BBDC4',
  'BBSE3',
  'BPAC11',
  'BRAP4',
  'BRAV3',
  'BRKM5',
  'CEAB3',
  'CMIG4',
  'CMIN3',
  'COGN3',
  'CPFE3',
  'CPLE3',
  'CSAN3',
  'CSNA3',
  'CURY3',
  'CXSE3',
  'CYRE3',
  'DIRR3',
  'EGIE3',
  'EMBJ3',
  'ENEV3',
  'ENGI11',
  'EQTL3',
  'FLRY3',
  'GGBR4',
  'GOAU4',
  'HAPV3',
  'HYPE3',
  'IGTI11',
  'IRBR3',
  'ISAE4',
  'ITSA4',
  'ITUB4',
  'KLBN11',
  'LREN3',
  'MBRF3',
  'MGLU3',
  'MOTV3',
  'MRVE3',
  'MULT3',
  'NATU3',
  'PETR3',
  'PETR4',
  'POMO4',
  'PRIO3',
  'PSSA3',
  'RADL3',
  'RAIL3',
  'RAIZ4',
  'RDOR3',
  'RENT3',
  'SANB11',
  'SBSP3',
  'SMFT3',
  'SMTO3',
  'STBP3',
  'SUZB3',
  'TAEE11',
  'TEND3',
  'TIMS3',
  'TOTS3',
  'UGPA3',
  'USIM5',
  'VALE3',
  'VAMO3',
  'VBBR3',
  'VIVA3',
  'VIVT3',
  'WEGE3',
  'YDUQ3',
];

export const REGRA_IBOV = 'grupo:acoes_ibov';
export const GRUPO_IBOV = grupo('Ibovespa — carteira completa', [REGRA_IBOV, ...IBOVESPA_REFERENCIA]);
export const VERSAO_LISTA = 2;

export const WATCHLIST_PADRAO: GrupoWatch[] = [
  grupo('Índices domésticos', ['IBOV', 'IBXX', 'SMLL', 'IDIV', 'IFIX']),
  grupo('Blue chips', ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'BBDC4', 'ABEV3', 'WEGE3', 'B3SA3', 'ELET3', 'SUZB3', 'EMBJ3']),
  grupo('Agro e proteína', ['SLCE3', 'AGRO3', 'JBSS3', 'BEEF3', 'MBRF3', 'RAIZ4', 'SMTO3', 'TTEN3']),
  grupo('Índices globais', ['SPX', 'NDX', 'DJI', 'KOSPI', 'N225', 'DAX', 'SSEC']),
  grupo('Renda fixa e taxas', [
    'SELIC',
    'CDI',
    'IPCA12M',
    'DI1F27',
    'DI1F29',
    'DI1F31',
    'UST2',
    'UST10',
    'TESOURO_PRE_*',
    'TESOURO_IPCA_*',
  ]),
  GRUPO_IBOV,
];

export const LIMITES_PADRAO: Limite[] = [
  { id: 'USDBRL', tipo: 'acima', valor: 5.1, ativo: true },
  { id: 'DI1F29', tipo: 'acima', valor: 12.75, ativo: true },
  { id: 'BOI_CEPEA', tipo: 'abaixo', valor: 370, ativo: true },
];

export const CONFIG_PADRAO: Config = {
  nomeApp: 'Radar de Investimentos',
  corDestaque: COR_PADRAO,
  tema: 'sistema',
  mostrarLogos: true,
  watchlist: WATCHLIST_PADRAO,
  limites: LIMITES_PADRAO,
  versaoLista: VERSAO_LISTA,
};

/** Completa uma config salva (ou vinda de backup) com os padrões, sem confiar no formato. */
export function normalizarConfig(c: unknown): Config {
  const o = (c && typeof c === 'object' ? c : {}) as Partial<Config>;
  const tema: Tema = o.tema === 'claro' || o.tema === 'escuro' ? o.tema : 'sistema';
  return {
    nomeApp: typeof o.nomeApp === 'string' && o.nomeApp.trim() ? o.nomeApp : CONFIG_PADRAO.nomeApp,
    corDestaque:
      typeof o.corDestaque === 'string' &&
      /^#[0-9a-f]{6}$/i.test(o.corDestaque) &&
      o.corDestaque.toUpperCase() !== COR_PADRAO_ANTIGA
        ? o.corDestaque
        : COR_PADRAO,
    tema,
    mostrarLogos: o.mostrarLogos !== false,
    watchlist: Array.isArray(o.watchlist) ? migrarLista(o.watchlist, o.versaoLista ?? 1) : WATCHLIST_PADRAO,
    limites: Array.isArray(o.limites) ? o.limites : LIMITES_PADRAO,
    ...(typeof o.atualizadaEm === 'string' ? { atualizadaEm: o.atualizadaEm } : {}),
    versaoLista: VERSAO_LISTA,
  };
}

/** Acrescenta à lista de quem já usa o app os grupos padrão criados depois (sem mexer no que a pessoa editou). */
function migrarLista(lista: GrupoWatch[], versao: number): GrupoWatch[] {
  let r = lista;
  if (versao < 2 && !r.some((g) => g.itens.some((i) => i.id === REGRA_IBOV))) r = [...r, GRUPO_IBOV];
  return r;
}

/** Id da watchlist com curinga no fim ("TESOURO_PRE_*") casa com qualquer id que comece igual. */
export function casaId(padrao: string, id: string): boolean {
  return padrao.endsWith('*') ? id.startsWith(padrao.slice(0, -1)) : padrao === id;
}

/** Regras da watchlist: "grupo:xxx" (todos do grupo) e "PREFIXO_*" (todos os vencimentos). */
export const ehRegra = (id: string) => id.startsWith('grupo:') || id.endsWith('*');

export function descreverRegra(id: string): string {
  if (id.startsWith('grupo:')) return `todos do grupo ${id.slice(6)} (automático)`;
  if (id.endsWith('*')) return 'todos os vencimentos';
  return '';
}
