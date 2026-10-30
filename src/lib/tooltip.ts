import { dataISOParaDate, numero, sinal, valorComUnidade, FUSO } from './formato';
import { horaBR } from './edicoes';
import type { Ponto } from './precos';

/**
 * Conteúdo das dicas dos gráficos (ao passar o mouse ou com ← →): data, valor na unidade do ativo
 * e variação do dia. Funções puras, para testar sem navegador.
 */

const fmtSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: FUSO });
const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: FUSO });

/** "2026-10-20" → "ter, 20/10/2026". */
export function dataDica(iso: string): string {
  const d = dataISOParaDate(iso);
  return `${fmtSemana.format(d).replace('.', '')}, ${fmtData.format(d)}`;
}

/** Valor com a unidade do ativo: "205.079 pts", "R$ 5,05", "12,66% a.a.", "US$ 109,55/barril". */
export function valorDica(v: number, unidade?: string | null): string {
  const u = (unidade ?? '').trim();
  if (/^(pts|pontos)$/i.test(u)) return `${numero(v, 0)} ${u}`;
  return valorComUnidade(v, u || null);
}

/** Taxas (juros) variam em pontos-base. */
export const ehTaxa = (unidade?: string | null, pontos: Ponto[] = []) =>
  pontos.some((p) => p.vb !== undefined) || /a\.?a\.?|% ?a\.m/i.test(unidade ?? '');

export type VariacaoDica = { texto: string; dir: 'alta' | 'baixa' | 'estavel'; calculada: boolean };

function montar(v: number, pb: boolean, calculada: boolean): VariacaoDica {
  const casas = pb ? 0 : 2;
  const arred = Number(v.toFixed(casas));
  if (arred === 0) return { texto: 'estável', dir: 'estavel', calculada };
  const dir = arred > 0 ? 'alta' : 'baixa';
  const n = pb ? `${numero(Math.abs(v), 0)} pb` : `${numero(Math.abs(v), 2)}%`;
  return { texto: `${dir === 'alta' ? '▲' : '▼'} ${n}`, dir, calculada };
}

/** Ponto anterior com valor (dias sem dado são pulados). */
export function anteriorValido(ys: (number | null | undefined)[], i: number): number | null {
  for (let j = i - 1; j >= 0; j--) if (typeof ys[j] === 'number') return j;
  return null;
}

/** Índice válido mais próximo de `i` (o cursor pula dias sem dado). */
export function indiceValido(ys: (number | null | undefined)[], i: number): number | null {
  if (typeof ys[i] === 'number') return i;
  for (let d = 1; d < ys.length; d++) {
    if (typeof ys[i - d] === 'number') return i - d;
    if (typeof ys[i + d] === 'number') return i + d;
  }
  return null;
}

/** Próximo índice com valor na direção dada (← −1, → +1), ou o mesmo se não houver. */
export function proximoValido(ys: (number | null | undefined)[], i: number, dir: 1 | -1): number {
  for (let j = i + dir; j >= 0 && j < ys.length; j += dir) if (typeof ys[j] === 'number') return j;
  return i;
}

/**
 * Variação do dia no ponto `i`: a do arquivo (`variacao_pct`/`variacao_pb`) quando houver;
 * senão, calculada contra o ponto anterior com valor e marcada "(calculada)".
 */
export function variacaoDia(pontos: Ponto[], i: number, taxa: boolean): VariacaoDica | null {
  const p = pontos[i];
  if (!p) return null;
  if (taxa && p.vb !== undefined) return montar(p.vb, true, false);
  if (!taxa && p.vp !== undefined) return montar(p.vp, false, false);
  if (p.vb !== undefined) return montar(p.vb, true, false);
  if (p.vp !== undefined) return montar(p.vp, false, false);
  const j = anteriorValido(
    pontos.map((q) => q.y),
    i,
  );
  if (j === null) return null;
  const ant = pontos[j]!.y;
  if (taxa) return montar((p.y - ant) * 100, true, true);
  if (!ant) return null;
  return montar((p.y / ant - 1) * 100, false, true);
}

/** Variação acumulada desde o primeiro ponto visível. */
export function variacaoPeriodo(pontos: Ponto[], i: number, taxa: boolean): VariacaoDica | null {
  const p = pontos[i];
  const ini = pontos[0];
  if (!p || !ini || i === 0) return null;
  if (taxa) return montar((p.y - ini.y) * 100, true, false);
  if (!ini.y) return null;
  return montar((p.y / ini.y - 1) * 100, false, false);
}

export const textoVariacao = (v: VariacaoDica | null) => (v ? `${v.texto}${v.calculada ? ' (calculada)' : ''}` : '—');

/** Linha de data da dica: "ter, 20/10/2026 · intradiário 12h24". */
export const tituloDica = (x: string, intradiario?: { hora: string | null } | null) =>
  intradiario ? `${dataDica(x)} · intradiário${intradiario.hora ? ` ${horaBR(intradiario.hora)}` : ''}` : dataDica(x);

/** Variação em % com sinal, para o modo normalizado ("desde o início do período"). */
export const pctSinal = (v: number) => `${sinal(v)}${numero(Math.abs(v), 2)}%`;
