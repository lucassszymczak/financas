import { parseDateBR, todayISO } from '../dates';
import type { Forma } from '../db/schemas';
import { parseMoney } from '../money';
import { normalizar } from './normalizar';

const RE_DINHEIRO = /(?:R\$\s*)?(\d{1,3}(?:[.\s]\d{3})+,\d{2}|\d+,\d{2})(?!\d)|R\$\s*(\d+\.\d{2})(?!\d)/g;

/** Valores monetários de uma linha, em centavos, na ordem em que aparecem. */
export function valoresNaLinha(linha: string): number[] {
  const out: number[] = [];
  for (const m of linha.matchAll(RE_DINHEIRO)) {
    const bruto = (m[1] ?? m[2] ?? '').replace(/\s/g, '.');
    const v = parseMoney(m[2] ? bruto.replace('.', ',') : bruto);
    if (v !== null && v > 0) out.push(v);
  }
  return out;
}

const PRIORIDADES: RegExp[] = [/\bvalor a pagar\b/, /\bvalor pago\b/, /\bvalor total\b/, /\btotal\b/, /\bvalor\b/];
const EXCLUIR_TOTAL = /\b(subtotal|troco|desconto|tributos|impostos|qtd|quantidade|itens)\b/;

/** Valor: prioridade para TOTAL / VALOR TOTAL / VALOR A PAGAR / VALOR PAGO / VALOR; senão o maior valor. */
export function extrairValor(texto: string): number | null {
  const linhas = texto.split(/\r?\n/);
  const norm = linhas.map(normalizar);
  for (const re of PRIORIDADES) {
    for (let i = 0; i < linhas.length; i++) {
      if (!re.test(norm[i]!) || EXCLUIR_TOTAL.test(norm[i]!)) continue;
      const aqui = valoresNaLinha(linhas[i]!);
      if (aqui.length) return aqui[aqui.length - 1]!;
      const prox = linhas[i + 1] ? valoresNaLinha(linhas[i + 1]!) : [];
      if (prox.length) return prox[0]!;
    }
  }
  const todos = linhas.filter((_, i) => !/\btroco\b/.test(norm[i]!)).flatMap(valoresNaLinha);
  return todos.length ? Math.max(...todos) : null;
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

/** Data: dd/mm/aaaa, dd/mm/aa, dd/mm ou "05 out 2026". Ignora datas no futuro. */
export function extrairData(texto: string, ref: Date = new Date()): string | null {
  const hoje = todayISO(ref);
  const ok = (d: string | null) => (d && d <= hoje ? d : null);
  for (const m of texto.matchAll(/(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/g)) {
    const d = ok(parseDateBR(`${m[1]}/${m[2]}/${m[3]}`, ref));
    if (d) return d;
  }
  for (const m of texto.matchAll(
    /(?<!\d)(\d{1,2})\s*(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?\s*(?:de\s+)?(\d{4})?/gi,
  )) {
    const mes = MESES[m[2]!.toLowerCase()];
    const d = ok(parseDateBR(`${m[1]}/${mes}${m[3] ? `/${m[3]}` : ''}`, ref));
    if (d) return d;
  }
  for (const m of texto.matchAll(/(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/g)) {
    const d = ok(parseDateBR(`${m[1]}/${m[2]}`, ref));
    if (d) return d;
  }
  return null;
}

/** Valida os dígitos verificadores de um CNPJ (14 dígitos). */
export function cnpjValido(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (base: string, pesos: number[]) => {
    const s = pesos.reduce((a, p, i) => a + Number(base[i]) * p, 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(d.slice(0, 12), p1);
  const d2 = calc(d.slice(0, 12) + d1, p2);
  return d.endsWith(`${d1}${d2}`);
}

export function formatarCNPJ(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '');
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : cnpj;
}

/** Primeiro CNPJ com dígitos verificadores válidos. */
export function extrairCNPJ(texto: string): string | null {
  for (const m of texto.matchAll(/(?<!\d)(\d{2}[.\s]?\d{3}[.\s]?\d{3}\s?\/?\s?\d{4}\s?-?\s?\d{2})(?!\d)/g)) {
    if (cnpjValido(m[1]!)) return formatarCNPJ(m[1]!);
  }
  return null;
}

const NAO_ESTABELECIMENTO =
  /\b(cnpj|cpf|ie|im|documento|cupom|nota|fiscal|danfe|nfc|extrato|comprovante|data|hora|valor|total|r\$|autenticacao|transacao|via|cliente|consumidor|sat|serie|protocolo|agencia|conta|banco|pagamento|transferencia|pix|recibo|chave|id|codigo)\b/;

/** Estabelecimento: "Para"/"Recebedor" em comprovante de Pix; senão a primeira linha relevante em maiúsculas. */
export function extrairEstabelecimento(texto: string): string | null {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (/\bpix\b/i.test(texto)) {
    for (let i = 0; i < linhas.length; i++) {
      const m = /^(para|recebedor|destinat[aá]rio|favorecido)\b\s*:?\s*(.*)$/i.exec(linhas[i]!);
      if (!m) continue;
      const resto = m[2]!.trim();
      if (resto.length >= 3 && /[a-z]{3}/i.test(resto)) return limparNome(resto);
      for (let j = i + 1; j < Math.min(i + 4, linhas.length); j++) {
        const l = linhas[j]!;
        if (/^nome\s*:?\s*/i.test(l) && l.replace(/^nome\s*:?\s*/i, '').length >= 3)
          return limparNome(l.replace(/^nome\s*:?\s*/i, ''));
        if (/[a-z]{3}/i.test(l) && !NAO_ESTABELECIMENTO.test(normalizar(l))) return limparNome(l);
      }
    }
  }
  for (const l of linhas.slice(0, 12)) {
    const letras = l.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letras.length < 4) continue;
    const maiusculas = l.replace(/[^A-ZÀ-Þ]/g, '').length;
    if (maiusculas / letras.length < 0.7) continue;
    const digitos = l.replace(/\D/g, '').length;
    if (digitos > letras.length) continue;
    if (NAO_ESTABELECIMENTO.test(normalizar(l))) continue;
    return limparNome(l);
  }
  return null;
}

function limparNome(s: string): string {
  return s
    .replace(/[|_*~"`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

/** Forma: Pix → Conta / Pix; crédito/débito/cartão → Cartão. */
export function extrairForma(texto: string): Forma | null {
  const n = normalizar(texto);
  if (/\bpix\b/.test(n)) return 'Conta / Pix';
  if (/\b(credito|debito|cartao|visa|mastercard|master|elo|hipercard|amex)\b/.test(n)) return 'Cartão';
  if (/\bdinheiro\b/.test(n)) return 'Dinheiro';
  return null;
}

const PALAVRAS_CATEGORIA =
  /^(restaurantes?|alimentacao|mercados?|supermercados?|transporte|saude|servicos|compras|lazer|viagens?|educacao|outros|casa|vestuario|eletronicos|entretenimento|assinaturas|combustivel|farmacias?|bares|delivery|beleza|pets?|esportes|seguros|moradia|presentes|tecnologia|cuidados pessoais)$/;

export type ItemResumo = { descricao: string; valor: number };

/**
 * Resumo por categoria de app de cartão: linhas "categoria ... R$ valor".
 * Retorna null se o texto não parecer um resumo (menos de 3 pares ou poucas categorias conhecidas).
 */
export function extrairResumoCategorias(texto: string): ItemResumo[] | null {
  const itens: ItemResumo[] = [];
  let conhecidas = 0;
  for (const linha of texto.split(/\r?\n/)) {
    const m = /^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s&/,-]{2,40}?)[\s.:–-]*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/.exec(linha);
    if (!m) continue;
    const descricao = m[1]!.replace(/[\s.:–-]+$/, '').trim();
    const n = normalizar(descricao);
    if (/\b(total|saldo|limite|fatura|disponivel)\b/.test(n)) continue;
    const valor = parseMoney(m[2]!);
    if (!valor) continue;
    if (PALAVRAS_CATEGORIA.test(n)) conhecidas++;
    itens.push({ descricao, valor });
  }
  return itens.length >= 3 && conhecidas >= 2 ? itens : null;
}

export type AnaliseRecibo = {
  valor: number | null;
  data: string | null;
  cnpj: string | null;
  estabelecimento: string | null;
  forma: Forma | null;
  resumo: ItemResumo[] | null;
};

export function analisarRecibo(texto: string, ref: Date = new Date()): AnaliseRecibo {
  return {
    valor: extrairValor(texto),
    data: extrairData(texto, ref),
    cnpj: extrairCNPJ(texto),
    estabelecimento: extrairEstabelecimento(texto),
    forma: extrairForma(texto),
    resumo: extrairResumoCategorias(texto),
  };
}
