import { parseDateBR } from '../dates';
import type { CsvMapping } from '../db/schemas';
import { parseMoney } from '../money';
import type { LinhaExtrato } from './extrato';
import { normalizar } from './normalizar';

export type Separador = ';' | ',' | '\t';

/** Conta separadores fora de aspas nas primeiras linhas e escolhe o mais consistente. */
export function detectarSeparador(texto: string): Separador {
  const linhas = texto
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, 10);
  const contar = (l: string, s: string) => {
    let n = 0;
    let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === s && !q) n++;
    }
    return n;
  };
  let melhor: Separador = ',';
  let melhorScore = -1;
  for (const s of [';', ',', '\t'] as const) {
    const counts = linhas.map((l) => contar(l, s));
    const min = Math.min(...counts);
    if (min > 0 && min > melhorScore) {
      melhor = s;
      melhorScore = min;
    }
  }
  return melhor;
}

/** CSV com aspas ("a;b", aspas duplas escapadas por ""). */
export function parseCSV(texto: string, sep: Separador): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  const t = texto.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]!;
    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

function ehData(s: string): boolean {
  return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s) || /^\d{4}-\d{2}-\d{2}/.test(s);
}

function ehValor(s: string): boolean {
  return /^[-+(]?\s*(R\$)?\s*-?[\d.,]+\)?-?$/.test(s) && /\d/.test(s) && !ehData(s) && parseMoney(s) !== null;
}

export type Deteccao = Omit<CsvMapping, 'banco' | 'assinatura'>;

const H_DATA = /^(data|date|dt)\b|data lancamento|data da compra|data movimento/;
const H_DESC = /descri|histor|lancamento|estabelecimento|memo|title|titulo|detalhe/;
const H_VALOR = /^valor|amount|quantia|valor r|^montante/;

/** Detecta cabeçalho e colunas de data, descrição e valor. null se não conseguir. */
export function detectarMapeamento(rows: string[][], separador: Separador): Deteccao | null {
  if (rows.length === 0) return null;
  const header = rows[0]!.map(normalizar);
  const temCabecalho = !rows[0]!.some(ehData) && !rows[0]!.some((c) => ehValor(c));
  const dados = rows.slice(temCabecalho ? 1 : 0, 41);
  if (dados.length === 0) return null;
  const ncols = Math.max(...rows.map((r) => r.length));

  const frac = (col: number, f: (s: string) => boolean) => dados.filter((r) => f(r[col] ?? '')).length / dados.length;

  let colData = -1;
  let colDescricao = -1;
  let colValor = -1;
  if (temCabecalho) {
    colData = header.findIndex((h) => H_DATA.test(h));
    colValor = header.findIndex((h, i) => i !== colData && H_VALOR.test(h));
    colDescricao = header.findIndex((h, i) => i !== colData && i !== colValor && H_DESC.test(h));
  }
  const cols = [...Array(ncols).keys()];
  if (colData < 0 || frac(colData, ehData) < 0.8) colData = cols.find((c) => frac(c, ehData) >= 0.8) ?? -1;
  if (colValor < 0 || frac(colValor, ehValor) < 0.8)
    colValor = [...cols].reverse().find((c) => c !== colData && frac(c, ehValor) >= 0.8) ?? -1;
  if (colDescricao < 0) {
    const media = (c: number) => dados.reduce((a, r) => a + (r[c]?.length ?? 0), 0) / dados.length;
    colDescricao =
      cols.filter((c) => c !== colData && c !== colValor && frac(c, ehValor) < 0.5).sort((a, b) => media(b) - media(a))[0] ?? -1;
  }
  if (colData < 0 || colValor < 0 || colDescricao < 0) return null;

  const datas = dados.map((r) => r[colData] ?? '');
  const formatoData = datas.filter((d) => /^\d{4}-/.test(d)).length > datas.length / 2 ? 'aaaa-mm-dd' : 'dd/mm/aaaa';
  const valores = dados.map((r) => r[colValor] ?? '');
  const brasileiro = valores.some((v) => /,\d{1,2}\)?-?$/.test(v)) || !valores.some((v) => /\.\d{2}\)?-?$/.test(v));
  const formatoValor = brasileiro ? 'br' : 'us';
  const nums = valores.map((v) => valorCSV(v, formatoValor)).filter((v): v is number => v !== null);
  const positivos = nums.filter((n) => n > 0).length;
  const positivoEhSaida = nums.length > 0 && positivos / nums.length >= 0.9;
  return { separador, temCabecalho, colData, colDescricao, colValor, formatoData, formatoValor, positivoEhSaida };
}

export function valorCSV(v: string, formato: 'br' | 'us'): number | null {
  let s = v.trim();
  if (formato === 'br') s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  return parseMoney(s);
}

export function aplicarMapeamento(rows: string[][], m: Deteccao, ref = new Date()): LinhaExtrato[] {
  const out: LinhaExtrato[] = [];
  for (const r of rows.slice(m.temCabecalho ? 1 : 0)) {
    const data = parseDateBR(r[m.colData] ?? '', ref);
    const v = valorCSV(r[m.colValor] ?? '', m.formatoValor);
    if (!data || v === null || v === 0) continue;
    out.push({ data, valor: m.positivoEhSaida ? -v : v, descricao: (r[m.colDescricao] ?? '').replace(/\s+/g, ' ').trim() });
  }
  return out;
}

/** Assinatura do cabeçalho, para reconhecer um mapeamento salvo. */
export function assinaturaCSV(rows: string[][]): string {
  return (rows[0] ?? []).map(normalizar).join('|');
}
