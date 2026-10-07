import JSZip from 'jszip';
import type { PlanoDB } from '../db/db';
import { TIPO_LABEL } from '../db/categories';
import type { Transaction } from '../db/schemas';
import { formatDateBR } from '../dates';
import { semAcentos } from '../finance/chave';
import { formatDecimalBR } from '../money';

const BOM = '\uFEFF';

function campo(v: string): string {
  return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** CSV com separador ";", BOM UTF-8 e vírgula decimal (abre direto no Excel em português). */
export function gerarCSV(cabecalho: string[], linhas: string[][]): string {
  return BOM + [cabecalho, ...linhas].map((l) => l.map(campo).join(';')).join('\r\n') + '\r\n';
}

export function doAno(txs: readonly Transaction[], ano: number): Transaction[] {
  const p = `${ano}-`;
  return txs.filter((t) => t.data.startsWith(p)).sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

export function totaisIR(txs: readonly Transaction[], ano: number): { saude: number; educacao: number } {
  const out = { saude: 0, educacao: 0 };
  for (const t of doAno(txs, ano)) if (t.dedutivel) out[t.dedutivel] += t.valor;
  return out;
}

export function csvLancamentos(txs: readonly Transaction[], ano: number): string {
  return gerarCSV(
    [
      'Data',
      'Tipo',
      'Categoria',
      'Descrição',
      'Estabelecimento',
      'Valor',
      'Forma',
      'Origem',
      'Dedutível',
      'CNPJ/CPF',
      'Beneficiário',
    ],
    doAno(txs, ano).map((t) => [
      formatDateBR(t.data),
      TIPO_LABEL[t.tipo],
      t.categoria,
      t.descricao,
      t.estabelecimento,
      formatDecimalBR(t.valor),
      t.forma,
      t.origem,
      t.dedutivel === 'saude' ? 'Saúde' : t.dedutivel === 'educacao' ? 'Educação' : '',
      t.cnpj ?? '',
      t.beneficiario ?? '',
    ]),
  );
}

function slug(s: string): string {
  return (
    semAcentos(s.toLowerCase())
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'sem-nome'
  );
}

/** AAAA-MM-DD_beneficiario_valor.jpg */
export function nomeComprovante(
  t: Pick<Transaction, 'data' | 'beneficiario' | 'estabelecimento' | 'descricao' | 'valor'>,
  ext = 'jpg',
): string {
  return `${t.data}_${slug(t.beneficiario || t.estabelecimento || t.descricao)}_${formatDecimalBR(t.valor)}.${ext}`;
}

/** Nomes únicos (acrescenta _2, _3...). */
export function nomesUnicos(nomes: readonly string[]): string[] {
  const vistos = new Map<string, number>();
  return nomes.map((n) => {
    const k = vistos.get(n) ?? 0;
    vistos.set(n, k + 1);
    if (k === 0) return n;
    const i = n.lastIndexOf('.');
    return `${n.slice(0, i)}_${k + 1}${n.slice(i)}`;
  });
}

export function csvDedutiveis(txs: readonly Transaction[], ano: number): string {
  const ded = doAno(txs, ano).filter((t) => t.dedutivel);
  const nomes = nomesUnicos(ded.map((t) => nomeComprovante(t)));
  return gerarCSV(
    ['Data', 'Tipo', 'Beneficiário', 'CNPJ/CPF', 'Valor', 'Descrição', 'Comprovante'],
    ded.map((t, i) => [
      formatDateBR(t.data),
      t.dedutivel === 'saude' ? 'Saúde' : 'Educação',
      t.beneficiario || t.estabelecimento,
      t.cnpj ?? '',
      formatDecimalBR(t.valor),
      t.descricao,
      t.comprovanteId ? nomes[i]! : 'pendente',
    ]),
  );
}

function extensao(tipo: string): string {
  return tipo === 'image/png' ? 'png' : tipo === 'application/pdf' ? 'pdf' : 'jpg';
}

/** ZIP com os comprovantes do ano (dedutíveis e demais), nomeados AAAA-MM-DD_beneficiario_valor.jpg. */
export async function zipComprovantesAno(database: PlanoDB, ano: number): Promise<{ blob: Blob; quantidade: number }> {
  const txs = doAno(await database.transactions.toArray(), ano).filter((t) => t.comprovanteId);
  const zip = new JSZip();
  const itens: { nome: string; blob: Blob }[] = [];
  for (const t of txs) {
    const r = await database.receipts.get(t.comprovanteId!);
    if (r) itens.push({ nome: nomeComprovante(t, extensao(r.tipoArquivo)), blob: r.blob });
  }
  const nomes = nomesUnicos(itens.map((i) => i.nome));
  for (let i = 0; i < itens.length; i++) zip.file(nomes[i]!, new Uint8Array(await itens[i]!.blob.arrayBuffer()));
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return { blob: new Blob([bytes as BlobPart], { type: 'application/zip' }), quantidade: itens.length };
}
