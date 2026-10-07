import { categoriaPadrao } from '../db/categories';
import type { CategoryRule, Dedutivel, KeywordEntry, Tipo } from '../db/schemas';
import { chaveEstabelecimento } from '../finance/chave';
import { normalizar } from './normalizar';

export type Sugestao = {
  tipo: Tipo;
  categoria: string;
  dedutivel: Dedutivel;
  fonte: 'regra' | 'dicionario' | 'padrao';
  palavra?: string;
};

/** Posição da palavra-chave no texto normalizado, casando pelo início das palavras. -1 se não houver. */
function posicao(textoNorm: string, palavra: string): number {
  const p = normalizar(palavra);
  if (!p) return -1;
  const re = new RegExp(`(^|\\s)${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const m = re.exec(textoNorm);
  return m ? m.index + m[1]!.length : -1;
}

/**
 * Categoriza por ordem de prioridade:
 * 1. regra aprendida pela chave do estabelecimento;
 * 2. dicionário de palavras-chave (vence a que aparece primeiro; empate → a mais longa);
 * 3. "Outros".
 */
export function categorizar(
  texto: string,
  ctx: { regras: ReadonlyMap<string, CategoryRule>; dicionario: readonly KeywordEntry[]; tipoPadrao?: Tipo },
): Sugestao {
  const tipoPadrao = ctx.tipoPadrao ?? 'saida';
  const chave = chaveEstabelecimento(texto);
  const regra = chave ? ctx.regras.get(chave) : undefined;
  if (regra) return { tipo: regra.tipo, categoria: regra.categoria, dedutivel: null, fonte: 'regra' };

  const norm = normalizar(texto);
  let melhor: { k: KeywordEntry; pos: number } | null = null;
  for (const k of ctx.dicionario) {
    // Entradas (recebi...) só casam com palavras de entrada, e vice-versa,
    // exceto as que sugerem tipo trabalho a partir de uma saída.
    if (tipoPadrao === 'entrada' && k.tipo !== 'entrada') continue;
    if (tipoPadrao !== 'entrada' && k.tipo === 'entrada') continue;
    const pos = posicao(norm, k.palavra);
    if (pos < 0) continue;
    if (!melhor || pos < melhor.pos || (pos === melhor.pos && k.palavra.length > melhor.k.palavra.length)) melhor = { k, pos };
  }
  if (melhor) {
    return {
      tipo: melhor.k.tipo,
      categoria: melhor.k.categoria,
      dedutivel: melhor.k.dedutivel,
      fonte: 'dicionario',
      palavra: melhor.k.palavra,
    };
  }
  return { tipo: tipoPadrao, categoria: categoriaPadrao(tipoPadrao), dedutivel: null, fonte: 'padrao' };
}

export type Ignoravel = 'fatura' | 'transferencia' | 'estorno';

const IGNORAVEIS: { tipo: Ignoravel; re: RegExp }[] = [
  {
    tipo: 'fatura',
    re: /\b(pagamento|pagto|pgto|pag)( de)? fatura\b|\bfatura (do )?cartao\b|\bpagamento recebido\b|\bpagamento efetuado\b/,
  },
  {
    tipo: 'transferencia',
    re: /\bentre contas\b|\bmesma titularidade\b|\bconta propria\b|\bcontas proprias\b|\btransf(erencia)? propria\b|\baplicacao automatica\b|\bresgate automatico\b/,
  },
  { tipo: 'estorno', re: /\bestorno\b|\bestornado\b|\bcancelamento\b|\bdevolucao\b|\bchargeback\b/ },
];

export const IGNORAVEL_LABEL: Record<Ignoravel, string> = {
  fatura: 'Pagamento de fatura',
  transferencia: 'Transferência entre contas próprias',
  estorno: 'Estorno',
};

/** Pagamento de fatura, transferência entre contas próprias e estorno chegam desmarcados. */
export function detectarIgnoravel(texto: string): Ignoravel | null {
  const n = normalizar(texto);
  for (const { tipo, re } of IGNORAVEIS) if (re.test(n)) return tipo;
  return null;
}
