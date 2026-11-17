import type { Radar } from '../schema/radar';
import { FUSO } from './formato';

/**
 * Várias edições por dia: a da manhã (07h15) e a atualização do meio-dia (12h30).
 * A chave de cada edição é `data#tipo`; tipos desconhecidos levam também o `gerado_em`,
 * para duas edições diferentes nunca colidirem.
 */

export const TIPO_MANHA = 'manha';
export const TIPO_MEIO_DIA = 'atualizacao_meio_dia';
const CONHECIDOS = new Set([TIPO_MANHA, TIPO_MEIO_DIA]);

/** Hora padrão das edições antigas, que não trazem `gerado_em` nem `hora`. */
export const HORA_PADRAO_MANHA = '07:15';

export function tipoEdicao(r: Radar): string {
  return r.edicao.tipo?.trim() || TIPO_MANHA;
}

export function chaveEdicao(r: Radar): string {
  const tipo = tipoEdicao(r);
  const base = `${r.edicao.data}#${tipo}`;
  return CONHECIDOS.has(tipo) ? base : `${base}@${r.edicao.gerado_em ?? ''}`;
}

/** Data de uma chave (`2026-10-21#manha` → `2026-10-21`). Chaves antigas eram só a data. */
export const dataDaChave = (chave: string) => chave.split('#')[0]!;

/** Chave antiga (só a data) vira a edição da manhã. */
export const chaveMigrada = (chave: string) => (chave.includes('#') ? chave : `${chave}#${TIPO_MANHA}`);

/** "HH:MM" de um ISO com fuso, no horário de Brasília. */
export function horaDeISO(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: FUSO }).format(d);
}

/** Hora da edição: `gerado_em` em Brasília; sem ele, 07h15 (manhã) ou 12h30 (meio-dia). */
export function horaEdicao(r: Radar): string {
  return horaDeISO(r.edicao.gerado_em) ?? (tipoEdicao(r) === TIPO_MEIO_DIA ? '12:30' : HORA_PADRAO_MANHA);
}

/** "12:30" → "12h30". */
export const horaBR = (h: string | null | undefined) => (h ? h.replace(':', 'h') : '');

const ORDEM_TIPO: Record<string, number> = { [TIPO_MANHA]: 0, [TIPO_MEIO_DIA]: 1 };

/** Instante da edição para ordenar: `gerado_em` quando houver; senão, pela hora padrão do tipo. */
function instante(r: Radar): number {
  const t = r.edicao.gerado_em ? Date.parse(r.edicao.gerado_em) : NaN;
  if (!Number.isNaN(t)) return t;
  return Date.parse(`${r.edicao.data}T${horaEdicao(r)}:00-03:00`);
}

/**
 * Ordem das edições de um dia (da mais antiga para a mais recente). Não depende da ordem de
 * importação: usa `gerado_em`, depois o tipo e por fim a chave.
 */
export function compararEdicoes(a: Radar, b: Radar): number {
  return (
    instante(a) - instante(b) ||
    (ORDEM_TIPO[tipoEdicao(a)] ?? 9) - (ORDEM_TIPO[tipoEdicao(b)] ?? 9) ||
    chaveEdicao(a).localeCompare(chaveEdicao(b))
  );
}

export function rotuloTipo(r: Radar): string {
  const t = tipoEdicao(r);
  if (t === TIPO_MANHA) return 'Manhã';
  if (t === TIPO_MEIO_DIA) return 'Meio-dia';
  return t.replace(/_/g, ' ');
}
