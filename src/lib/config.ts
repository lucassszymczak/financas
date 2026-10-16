export type Tema = 'sistema' | 'claro' | 'escuro';

export type ItemWatch = { id: string; ativo: boolean };
export type GrupoWatch = { nome: string; itens: ItemWatch[] };
export type Limite = { id: string; tipo: 'acima' | 'abaixo'; valor: number; ativo: boolean };

export type Config = {
  nomeApp: string;
  corDestaque: string;
  tema: Tema;
  watchlist: GrupoWatch[];
  limites: Limite[];
};

export const COR_PADRAO = '#005C46';
export const LARANJA = '#F58220';

const grupo = (nome: string, ids: string[]): GrupoWatch => ({ nome, itens: ids.map((id) => ({ id, ativo: true })) });

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
  watchlist: WATCHLIST_PADRAO,
  limites: LIMITES_PADRAO,
};

/** Completa uma config salva (ou vinda de backup) com os padrões, sem confiar no formato. */
export function normalizarConfig(c: unknown): Config {
  const o = (c && typeof c === 'object' ? c : {}) as Partial<Config>;
  const tema: Tema = o.tema === 'claro' || o.tema === 'escuro' ? o.tema : 'sistema';
  return {
    nomeApp: typeof o.nomeApp === 'string' && o.nomeApp.trim() ? o.nomeApp : CONFIG_PADRAO.nomeApp,
    corDestaque: typeof o.corDestaque === 'string' && /^#[0-9a-f]{6}$/i.test(o.corDestaque) ? o.corDestaque : COR_PADRAO,
    tema,
    watchlist: Array.isArray(o.watchlist) ? o.watchlist : WATCHLIST_PADRAO,
    limites: Array.isArray(o.limites) ? o.limites : LIMITES_PADRAO,
  };
}

/** Id da watchlist com curinga no fim ("TESOURO_PRE_*") casa com qualquer id que comece igual. */
export function casaId(padrao: string, id: string): boolean {
  return padrao.endsWith('*') ? id.startsWith(padrao.slice(0, -1)) : padrao === id;
}
