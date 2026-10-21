/** Peso de um bushel por produto (kg), usado para levar o preço de Chicago para a saca. */
export const KG_POR_BUSHEL = { soja: 27.2155, trigo: 27.2155, milho: 25.4012 } as const;
export type Grao = keyof typeof KG_POR_BUSHEL;

export const KG_SACA = 60;
export const KG_ARROBA = 15;

export const reaisParaDolares = (reais: number, dolar: number) => reais / dolar;
export const dolaresParaReais = (dolares: number, dolar: number) => dolares * dolar;

/** US$/bushel → R$/saca de 60 kg. */
export function bushelParaSacaReais(usdPorBushel: number, dolar: number, grao: Grao): number {
  return usdPorBushel * (KG_SACA / KG_POR_BUSHEL[grao]) * dolar;
}

/** R$/saca de 60 kg → US$/bushel. */
export function sacaReaisParaBushel(reaisPorSaca: number, dolar: number, grao: Grao): number {
  return reaisPorSaca / dolar / (KG_SACA / KG_POR_BUSHEL[grao]);
}
