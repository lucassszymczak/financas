/** Datas são strings ISO locais: 'YYYY-MM-DD'; meses são 'YYYY-MM'. */

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function currentMonth(now: Date = new Date()): string {
  return todayISO(now).slice(0, 7);
}

export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = parseISODate(iso);
  return toISODate(d) === iso;
}

export function isValidMonth(ym: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(ym);
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y ?? 1970, m ?? 1, 0).getDate();
}

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y ?? 1970, (m ?? 1) - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Diferença em dias (b − a). */
export function diffDays(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function compareMonths(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function monthNumber(ym: string): number {
  return Number(ym.slice(5, 7));
}

export function monthLabel(ym: string): string {
  const m = monthNumber(ym);
  return `${MESES[m - 1] ?? ''} de ${ym.slice(0, 4)}`;
}

export function monthShort(ym: string): string {
  const m = monthNumber(ym);
  return `${MESES_CURTOS[m - 1] ?? ''}/${ym.slice(2, 4)}`;
}

export function monthName(m: number): string {
  return MESES[m - 1] ?? '';
}

/** 07/10/2026 */
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** 07/10 */
export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/**
 * Lê "dd/mm/aaaa", "dd/mm/aa", "dd/mm" (usa o ano de referência; se a data
 * ficar no futuro, usa o ano anterior), "aaaa-mm-dd" e "dd-mm-aaaa".
 */
export function parseDateBR(input: string, ref: Date = new Date()): string | null {
  const s = input.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (m) {
    let y = Number(m[3]);
    if (m[3]!.length === 2) y += 2000;
    return build(y, Number(m[2]), Number(m[1]));
  }
  m = /^(\d{1,2})[/.-](\d{1,2})$/.exec(s);
  if (m) {
    const y = ref.getFullYear();
    const iso = build(y, Number(m[2]), Number(m[1]));
    if (iso && iso > todayISO(ref)) return build(y - 1, Number(m[2]), Number(m[1]));
    return iso;
  }
  return null;
}

function build(y: number, m: number, d: number): string | null {
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  return isValidISODate(iso) ? iso : null;
}
