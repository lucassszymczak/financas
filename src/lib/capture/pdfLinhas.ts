import { parseDateBR } from '../dates';
import { parseMoney } from '../money';
import type { LinhaExtrato } from './extrato';

export type ItemTextoPDF = { str: string; x: number; y: number; w: number };

/** Agrupa itens de texto do pdf.js em linhas pela coordenada y (tolerância de 2 pt) e ordena por x. */
export function agruparLinhas(itens: readonly ItemTextoPDF[], tolerancia = 2): string[] {
  const ordenados = [...itens].filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const grupos: { y: number; itens: ItemTextoPDF[] }[] = [];
  for (const it of ordenados) {
    const g = grupos.find((g) => Math.abs(g.y - it.y) <= tolerancia);
    if (g) g.itens.push(it);
    else grupos.push({ y: it.y, itens: [it] });
  }
  return grupos
    .sort((a, b) => b.y - a.y)
    .map((g) => {
      const its = g.itens.sort((a, b) => a.x - b.x);
      let s = '';
      let fim = -Infinity;
      for (const it of its) {
        if (s && it.x - fim > 1) s += ' ';
        s += it.str;
        fim = it.x + it.w;
      }
      return s.replace(/\s+/g, ' ').trim();
    });
}

const MESES: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
};
const VALOR = String.raw`[-−]?\s?(?:R\$\s?)?[-−]?\d{1,3}(?:\.\d{3})*,\d{2}`;
const RE_LINHA = new RegExp(
  String.raw`^(\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?|\d{1,2}\s(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?(?:\s\d{4})?)\s+(.+?)\s+(${VALOR})(?:\s*([DC])\b)?(?:\s+(${VALOR})(?:\s*[DC]\b)?)?\s*$`,
  'i',
);
const CREDITO = /\b(recebid[oa]|credito|cr[eé]dito em conta|deposito|dep[oó]sito|salario|sal[aá]rio|rendimento)\b/i;
const IGNORAR = /\bsaldo\b|\btotal\b|^\s*data\b/i;

function dataLinha(s: string, ref: Date): string | null {
  const m = /^(\d{1,2})\s([a-z]{3})/i.exec(s);
  if (m) {
    const mes = MESES[m[2]!.toLowerCase()];
    const ano = /\d{4}/.exec(s)?.[0];
    if (!mes) return null;
    return parseDateBR(`${m[1]}/${mes}${ano ? `/${ano}` : ''}`, ref);
  }
  return parseDateBR(s.replace(/\./g, '/'), ref);
}

/**
 * Lançamento: data no início, descrição, valor no fim; sinal "-" ou indicação D/C.
 * Sem sinal, o valor é considerado saída (fatura de cartão).
 * Se houver dois valores no fim, o segundo é o saldo e é ignorado.
 */
export function parseLinhasExtrato(linhas: readonly string[], ref = new Date()): LinhaExtrato[] {
  const out: LinhaExtrato[] = [];
  for (const linha of linhas) {
    if (IGNORAR.test(linha)) continue;
    const m = RE_LINHA.exec(linha);
    if (!m) continue;
    const data = dataLinha(m[1]!, ref);
    const bruto = m[3]!.replace('−', '-').replace(/\s/g, '');
    const v = parseMoney(bruto);
    if (!data || v === null || v === 0) continue;
    const dc = m[4]?.toUpperCase();
    let valor: number;
    if (dc === 'C') valor = Math.abs(v);
    else if (dc === 'D') valor = -Math.abs(v);
    else if (v < 0) valor = v;
    else if (CREDITO.test(m[2]!)) valor = v;
    else valor = -v;
    out.push({ data, valor, descricao: m[2]!.trim() });
  }
  return out;
}
