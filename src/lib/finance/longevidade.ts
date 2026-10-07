import { addMonths, monthNumber } from '../dates';
import type { ModoLongevidade } from '../db/schemas';

/** Limite da regra: resultado mensal a partir de −R$ 500 permite subir. */
export const LIMITE_LONGEVIDADE = -50_000;
export const MESES_JANELA = [6, 11] as const;

export type VereditoLongevidade = 'subir' | 'esperar';

export function regraLongevidade(resultado: number): VereditoLongevidade {
  return resultado >= LIMITE_LONGEVIDADE ? 'subir' : 'esperar';
}

/** Próxima janela (junho ou novembro) a partir do mês informado, inclusive. */
export function proximaJanela(mes: string): string {
  let m = mes;
  for (let i = 0; i < 12; i++) {
    if ((MESES_JANELA as readonly number[]).includes(monthNumber(m))) return m;
    m = addMonths(m, 1);
  }
  return m;
}

const PCT: Record<ModoLongevidade, number> = { '2/2': 0.02, '6/6': 0.06 };

/** Contribuição mensal ao capital (parte do participante + da empresa). */
export function contribuicaoMensal(modo: ModoLongevidade, salarioBase: number): number {
  return Math.round(salarioBase * PCT[modo] * 2);
}

/** Parte que sai do bolso do participante. */
export function custoParticipante(modo: ModoLongevidade, salarioBase: number): number {
  return Math.round(salarioBase * PCT[modo]);
}

/** Custo extra para o participante ao passar de 2/2 para 6/6 (4% do salário base). */
export function custoExtraSubir(salarioBase: number): number {
  return Math.round(salarioBase * 0.04);
}
