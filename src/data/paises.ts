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
};

/** Grupos brasileiros: índices B3, curva DI, Tesouro e taxas levam a bandeira do Brasil. */
export const GRUPOS_BRASIL = new Set(['indices_br', 'indices_setoriais', 'juros_br', 'curva_di', 'tesouro', 'renda_fixa', 'taxas_referencia']);

/** Ids brasileiros fora desses grupos. */
export const IDS_BRASIL = new Set(['IBOV', 'SELIC', 'CDI', 'IPCA12M', 'IFIX', 'SMLL', 'IDIV']);
