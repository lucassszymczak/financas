/**
 * País de cada ativo internacional (código ISO de 2 letras, minúsculo, como no pacote flag-icons).
 * Índices, juros e moedas de fora; o que não estiver aqui segue as regras de `lib/icones.ts`.
 */
export const PAIS_POR_ID: Record<string, string> = {
  // Estados Unidos
  SPX: 'us',
  NDX: 'us',
  DJI: 'us',
  RUT: 'us',
  VIX: 'us',
  UST2: 'us',
  UST5: 'us',
  UST10: 'us',
  UST30: 'us',
  DXY: 'us',
  // Japão
  N225: 'jp',
  USDJPY: 'jp',
  // Alemanha
  DAX: 'de',
  BUND10: 'de',
  // Reino Unido
  UKX: 'gb',
  // França
  CAC: 'fr',
  // Zona do euro
  SXXP: 'eu',
  EURUSD: 'eu',
  // Hong Kong
  HSI: 'hk',
  // China
  SSEC: 'cn',
  USDCNY: 'cn',
  // Coreia do Sul
  KOSPI: 'kr',
  // Austrália
  AS51: 'au',
  // Argentina
  MERVAL: 'ar',
  // México
  MEXBOL: 'mx',
  USDMXN: 'mx',
};

/** Moeda → país da bandeira (pares contra o real mostram a moeda estrangeira: USDBRL → EUA). */
export const PAIS_POR_MOEDA: Record<string, string> = {
  USD: 'us',
  EUR: 'eu',
  GBP: 'gb',
  JPY: 'jp',
  CNY: 'cn',
  ARS: 'ar',
  MXN: 'mx',
  CHF: 'ch',
  CAD: 'ca',
  AUD: 'au',
  HKD: 'hk',
  KRW: 'kr',
  CLP: 'cl',
  COP: 'co',
  PEN: 'pe',
  INR: 'in',
  ZAR: 'za',
  TRY: 'tr',
  RUB: 'ru',
  NZD: 'nz',
  SEK: 'se',
  NOK: 'no',
  DKK: 'dk',
  SGD: 'sg',
  TWD: 'tw',
  ILS: 'il',
  PLN: 'pl',
};

/**
 * País pelo nome do ativo (índices, juros e moedas de fora), para ids que não estão em `PAIS_POR_ID`.
 * O texto é comparado sem acento e em minúsculas; a ordem importa (o mais específico vem antes).
 */
export const PAIS_POR_NOME: [RegExp, string][] = [
  // Moedas pelo nome (antes de "dólar" genérico)
  [/dolar australiano/, 'au'],
  [/dolar canadense/, 'ca'],
  [/dolar neozelandes/, 'nz'],
  [/dolar de hong kong|dolar hk/, 'hk'],
  [/dolar de singapura/, 'sg'],
  [/peso argentino/, 'ar'],
  [/peso mexicano/, 'mx'],
  [/peso chileno/, 'cl'],
  [/peso colombiano/, 'co'],
  [/franco suico/, 'ch'],
  [/lira turca/, 'tr'],
  [/\b(iene|yen)\b/, 'jp'],
  [/\b(yuan|renminbi)\b/, 'cn'],
  [/\brupia\b/, 'in'],
  [/\brand\b/, 'za'],
  [/\bwon\b/, 'kr'],
  [/\brublo\b/, 'ru'],
  [/\blibra\b/, 'gb'],
  // Índices e juros
  [/ftse mib|\bbtp\b|italia/, 'it'],
  [/euro ?stoxx|stoxx|zona do euro|europa/, 'eu'],
  [/\basx\b|australia/, 'au'],
  [/\btsx\b|canada/, 'ca'],
  [
    /s ?& ?p 500|\bs&p\b|sp ?500|nasdaq|dow jones|russell|\bvix\b|treasur|t-note|t-bond|nyse|wall street|estados unidos|\beua\b|\bfed\b/,
    'us',
  ],
  [/nikkei|topix|japao|\bjgb\b/, 'jp'],
  [/\bdax\b|alemanha|\bbund\b/, 'de'],
  [/ftse|reino unido|londres|\bgilt\b/, 'gb'],
  [/\bcac\b|franca|\boat\b/, 'fr'],
  [/hang seng|hong kong/, 'hk'],
  [/shanghai|shenzhen|csi ?300|china/, 'cn'],
  [/kospi|coreia/, 'kr'],
  [/merval|argentina/, 'ar'],
  [/mexbol|\bipc\b|mexico|\bbmv\b/, 'mx'],
  [/\bipsa\b|chile/, 'cl'],
  [/colcap|colombia/, 'co'],
  [/\bbvl\b|peru/, 'pe'],
  [/nifty|sensex|india/, 'in'],
  [/taiex|taiwan/, 'tw'],
  [/straits|singapura/, 'sg'],
  [/\bibex\b|espanha/, 'es'],
  [/\baex\b|holanda|paises baixos/, 'nl'],
  [/\bsmi\b|suica/, 'ch'],
  [/\bomx\b|suecia/, 'se'],
  [/africa do sul|\bjse\b/, 'za'],
  [/turquia|\bbist\b/, 'tr'],
  [/ibovespa|\bb3\b|brasil|\bifix\b|\bselic\b|\bcdi\b|\bipca\b|tesouro (direto|selic|ipca|prefixado)/, 'br'],
  // Por último, as moedas mais comuns (o par já foi tratado pelo código)
  [/\bdolar\b/, 'us'],
  [/\beuro\b/, 'eu'],
];

/** Grupos em que vale procurar o país pelo nome. */
export const GRUPOS_COM_PAIS = /^(indices|moedas|juros|curva|tesouro|renda_fixa|taxas)/;

/** Praça ou bolsa de um produto do agro/commodity → país do selinho no canto do ícone. */
export const PAIS_POR_PRACA: [RegExp, string][] = [
  [/chicago|cbot|\bcme\b|nova york|\bnymex\b|\bcomex\b|\bice us\b/, 'us'],
  [/cepea|\bb3\b|paranagua|guarapuava|noroeste paulista|aracatuba|barretos|brasil|\bsp\b|\bpr\b|\bmt\b|\bgo\b|\bms\b/, 'br'],
];

/** Grupos brasileiros: índices B3, curva DI, Tesouro e taxas levam a bandeira do Brasil. */
export const GRUPOS_BRASIL = new Set([
  'indices_br',
  'indices_setoriais',
  'juros_br',
  'curva_di',
  'tesouro',
  'renda_fixa',
  'taxas_referencia',
]);

/** Ids brasileiros fora desses grupos. */
export const IDS_BRASIL = new Set(['IBOV', 'SELIC', 'CDI', 'IPCA12M', 'IFIX', 'SMLL', 'IDIV']);
