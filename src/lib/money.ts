/** Valores monetários são sempre centavos inteiros. */

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNoCents = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function reais(cents: number): number {
  return cents / 100;
}

export function cents(reaisValue: number): number {
  return Math.round(reaisValue * 100);
}

/** R$ 1.234,56 (troca o espaço especial por um normal). */
export function formatBRL(value: number, opts: { semCentavos?: boolean } = {}): string {
  const f = opts.semCentavos ? fmtNoCents : fmt;
  return f.format(value / 100).replace(/\u00a0/g, ' ');
}

/** +R$ 10,00 / −R$ 10,00 */
export function formatBRLSigned(value: number, opts: { semCentavos?: boolean } = {}): string {
  if (value === 0) return formatBRL(0, opts);
  const abs = formatBRL(Math.abs(value), opts);
  return value > 0 ? `+${abs}` : `−${abs}`;
}

/** 1234,56 (para CSV brasileiro). */
export function formatDecimalBR(value: number): string {
  return fmtNum.format(value / 100).replace(/\./g, '');
}

/**
 * Converte texto em centavos. Aceita "1.234,56", "1234,56", "1234.56", "R$ 87",
 * "-12,3", "12,30-" e "(12,30)". Retorna null se não houver número.
 */
export function parseMoney(input: string): number | null {
  let s = input.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/R\$/gi, '').replace(/\s/g, '');
  if (s.startsWith('-') || s.startsWith('−')) {
    negative = true;
    s = s.slice(1);
  } else if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    // O separador que aparece por último é o decimal.
    if (lastComma > lastDot) normalized = s.replace(/\./g, '').replace(',', '.');
    else normalized = s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const decimals = s.length - lastComma - 1;
    const commas = s.split(',').length - 1;
    if (commas === 1 && decimals <= 2) normalized = s.replace(',', '.');
    else normalized = s.replace(/,/g, '');
  } else if (lastDot >= 0) {
    const decimals = s.length - lastDot - 1;
    const dots = s.split('.').length - 1;
    // "1.234" é milhar no padrão brasileiro; "12.5" e "12.50" são decimais.
    if (dots === 1 && decimals <= 2) normalized = s;
    else normalized = s.replace(/\./g, '');
  } else {
    normalized = s;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  const c = Math.round(n * 100);
  return negative ? -c : c;
}
