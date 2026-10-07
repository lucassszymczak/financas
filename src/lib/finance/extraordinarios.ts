/** Metas do plano para uso de extraordinários. */
export const RESERVA_MINIMA = 1_500_000;
export const RESERVA_ALVO = 3_000_000;
export const PCT_USO_LIVRE = 0.3;

export type DestinoExtra = 'reserva' | 'consignado' | 'cdc' | 'uso_livre';

export type Alocacao = { destino: DestinoExtra; valor: number; motivo: string };

export const DESTINO_CATEGORIA: Record<DestinoExtra, string> = {
  reserva: 'Depósito na reserva',
  consignado: 'Amortização de dívida',
  cdc: 'Amortização de dívida',
  uso_livre: 'Uso livre (30%)',
};

/**
 * Assistente de extraordinários:
 * 1. reserva abaixo de 15 mil → completar até 15 mil;
 * 2. amortizar o consignado até quitar;
 * 3. com o consignado quitado, o restante segue 30% uso livre e 70% patrimônio
 *    (reserva até 30 mil, depois amortização do CDC; a sobra vai para a reserva).
 */
export function sugerirAlocacao(valor: number, estado: { reserva: number; consignado: number; cdc: number }): Alocacao[] {
  const out: Alocacao[] = [];
  const add = (destino: DestinoExtra, v: number, motivo: string) => {
    if (v <= 0) return;
    const existente = out.find((a) => a.destino === destino && a.motivo === motivo);
    if (existente) existente.valor += v;
    else out.push({ destino, valor: v, motivo });
  };
  let resto = Math.max(0, valor);
  let reserva = estado.reserva;

  const paraMinima = Math.min(resto, Math.max(0, RESERVA_MINIMA - reserva));
  add('reserva', paraMinima, 'Completar a reserva mínima de R$ 15 mil');
  reserva += paraMinima;
  resto -= paraMinima;

  const paraConsignado = Math.min(resto, Math.max(0, estado.consignado));
  add('consignado', paraConsignado, 'Amortizar o consignado');
  resto -= paraConsignado;

  if (resto <= 0) return out;

  const usoLivre = Math.round(resto * PCT_USO_LIVRE);
  let patrimonio = resto - usoLivre;
  add('uso_livre', usoLivre, '30% para uso livre');

  const paraAlvo = Math.min(patrimonio, Math.max(0, RESERVA_ALVO - reserva));
  add('reserva', paraAlvo, 'Reserva até R$ 30 mil');
  patrimonio -= paraAlvo;

  const paraCdc = Math.min(patrimonio, Math.max(0, estado.cdc));
  add('cdc', paraCdc, 'Amortizar o CDC');
  patrimonio -= paraCdc;

  add('reserva', patrimonio, 'Reserva e investimentos');
  return out;
}
