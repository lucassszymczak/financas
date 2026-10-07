export type NivelTeto = 'ok' | 'amarelo' | 'vermelho';

export type StatusTeto = {
  gasto: number;
  teto: number;
  fracao: number;
  /** Quanto já deveria ter sido gasto no ritmo (teto × fração). */
  ritmo: number;
  acimaDoRitmo: boolean;
  pct: number;
  nivel: NivelTeto;
};

/**
 * fração = dia / dias_do_mês; alerta de ritmo se gasto > teto × fração × 1,15;
 * amarelo acima de 80% do teto; vermelho se estourou.
 */
export function statusTeto(gasto: number, teto: number, dia: number, diasNoMes: number): StatusTeto {
  const fracao = Math.min(1, Math.max(0, dia / diasNoMes));
  const ritmo = Math.round(teto * fracao);
  const acimaDoRitmo = gasto > teto * fracao * 1.15;
  const pct = teto > 0 ? gasto / teto : 0;
  const nivel: NivelTeto = gasto > teto ? 'vermelho' : pct > 0.8 ? 'amarelo' : 'ok';
  return { gasto, teto, fracao, ritmo, acimaDoRitmo, pct, nivel };
}
