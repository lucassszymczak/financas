/** Formatação em pt-BR. Datas sempre no fuso de Brasília. */

export const FUSO = 'America/Sao_Paulo';
export const VAZIO = '—';

const cacheNum = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number): Intl.NumberFormat {
  const k = `${min}-${max}`;
  let f = cacheNum.get(k);
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });
    cacheNum.set(k, f);
  }
  return f;
}

/** Normaliza o espaço especial que o Intl coloca (para testes e cópia previsível). */
const limpa = (s: string) => s.replace(/\u00a0|\u202f/g, ' ');

export function numero(v: number | null | undefined, min = 2, max = min): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return VAZIO;
  return limpa(nf(min, max).format(v));
}

/** Casas decimais automáticas: valores pequenos ganham mais precisão (5,087; 4,8075). */
export function numeroAuto(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return VAZIO;
  return numero(v, 2, Math.abs(v) < 10 ? 4 : 2);
}

export function reais(v: number | null | undefined, casas = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return VAZIO;
  return `R$ ${numero(v, casas)}`;
}

export function pct(v: number | null | undefined, casas = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return VAZIO;
  return `${numero(v, casas)}%`;
}

export function sinal(v: number): string {
  return v > 0 ? '+' : v < 0 ? '−' : '';
}

/** Valor separado em prefixo (moeda), número e sufixo (unidade), para destacar só o número. */
export function partesValor(
  v: number | null | undefined,
  unidade?: string | null,
): { prefixo: string; numero: string; sufixo: string } {
  const n = numeroAuto(v);
  const u = (unidade ?? '').trim();
  if (n === VAZIO || !u) return { prefixo: '', numero: n, sufixo: '' };
  if (u === 'R$' || u === 'US$') return { prefixo: u, numero: n, sufixo: '' };
  const moeda = u.match(/^(R\$|US\$)\s*\/\s*(.+)$/);
  if (moeda) return { prefixo: moeda[1]!, numero: n, sufixo: `/${moeda[2]}` };
  if (u.startsWith('%')) return { prefixo: '', numero: `${n}%`, sufixo: u.slice(1).trim() };
  return { prefixo: '', numero: n, sufixo: u };
}

/** Valor com unidade: "R$ 5,087", "204.324,26 pts", "12,73% a.a.", "R$ 154,70/sc 60 kg". */
export function valorComUnidade(v: number | null | undefined, unidade?: string | null): string {
  const n = numeroAuto(v);
  if (n === VAZIO) return VAZIO;
  const u = (unidade ?? '').trim();
  if (!u) return n;
  if (u === 'R$' || u === 'US$') return `${u} ${n}`;
  const moeda = u.match(/^(R\$|US\$)\s*\/\s*(.+)$/);
  if (moeda) return `${moeda[1]} ${n}/${moeda[2]}`;
  if (u.startsWith('%')) return `${n}${u}`;
  return `${n} ${u}`;
}

export type Variacao = { texto: string; dir: 'alta' | 'baixa' | 'estavel'; seta: string } | null;

/** Variação de um preço: em pb quando vier `variacao_pb` (juros), senão em %. */
export function variacao(item: { variacao_pct?: number | null; variacao_pb?: number | null }): Variacao {
  const pb = item.variacao_pb;
  const p = item.variacao_pct;
  const v = pb ?? p;
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const dir = v > 0 ? 'alta' : v < 0 ? 'baixa' : 'estavel';
  const seta = dir === 'alta' ? '▲' : dir === 'baixa' ? '▼' : '■';
  const abs = Math.abs(v);
  const texto = pb !== null && pb !== undefined ? `${sinal(v)}${numero(abs, 0, 1)} pb` : `${sinal(v)}${numero(abs, 2)}%`;
  return { texto, dir, seta };
}

/** "2026-10-16" → Date ao meio-dia UTC (evita virar o dia em qualquer fuso). */
export function dataISOParaDate(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a!, m! - 1, d!, 12));
}

const fmtDiaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: FUSO });
const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: FUSO });
const fmtLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: FUSO });
const fmtSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: FUSO });
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: FUSO,
});

export const diaMes = (iso: string | null | undefined) => (iso ? fmtDiaMes.format(dataISOParaDate(iso)) : VAZIO);
export const dataCurta = (iso: string | null | undefined) => (iso ? fmtData.format(dataISOParaDate(iso)) : VAZIO);
export const dataLonga = (iso: string) => fmtLonga.format(dataISOParaDate(iso));
export const diaSemanaCurto = (iso: string) => fmtSemana.format(dataISOParaDate(iso)).replace('.', '');
export function dataHora(instante: string | number | Date | null | undefined): string {
  if (instante === null || instante === undefined) return VAZIO;
  const d = new Date(instante);
  return Number.isNaN(d.getTime()) ? VAZIO : limpa(fmtDataHora.format(d));
}

/** Data de hoje em Brasília, no formato AAAA-MM-DD. */
export function hojeISO(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

/** Soma dias a uma data AAAA-MM-DD. */
export function somaDias(iso: string, dias: number): string {
  const d = dataISOParaDate(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Converte texto digitado ("1.234,56" ou "1234.56") em número. */
export function lerNumero(s: string): number | null {
  const t = s.trim().replace(/\s|R\$|%/g, '');
  if (!t) return null;
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** Bandeira a partir do código do país (BR → 🇧🇷). Códigos fora do padrão viram 🌐. */
export function bandeira(pais: string | null | undefined): string {
  const c = (pais ?? '').trim().toUpperCase();
  const mapa: Record<string, string> = { UE: 'EU', UK: 'GB' };
  const cod = mapa[c] ?? c;
  if (!/^[A-Z]{2}$/.test(cod)) return '🌐';
  return String.fromCodePoint(...[...cod].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** "indices_mundo" → "Indices mundo" (para grupos sem nome conhecido). */
export function humanizar(chave: string): string {
  const s = chave.replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
