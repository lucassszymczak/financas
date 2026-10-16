import { dataISOParaDate, somaDias } from './formato';

/**
 * Último pregão esperado para uma edição: o dia útil anterior à data da edição.
 * Considera só fins de semana (segunda olha sexta). Feriados não entram, por decisão do usuário.
 */
export function ultimoPregaoEsperado(edicaoData: string): string {
  let d = somaDias(edicaoData, -1);
  while (ehFimDeSemana(d)) d = somaDias(d, -1);
  return d;
}

export function ehFimDeSemana(iso: string): boolean {
  const dia = dataISOParaDate(iso).getUTCDay();
  return dia === 0 || dia === 6;
}

/**
 * Um dado é antigo quando sua data de referência é anterior ao último pregão esperado.
 * Itens semanais (com `periodo`) e itens sem data não contam como antigos.
 */
export function dadoAntigo(item: { data_ref?: string | null; periodo?: string | null }, edicaoData: string): boolean {
  if (item.periodo || !item.data_ref) return false;
  return item.data_ref < ultimoPregaoEsperado(edicaoData);
}
