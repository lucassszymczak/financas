import type { CategoryRule, Dedutivel, Forma, KeywordEntry, Origem, Tipo } from '../db/schemas';
import { newId } from '../id';
import { categorizar, detectarIgnoravel, type Ignoravel } from './categorizar';

/** Item da fila de revisão (ainda não gravado). */
export type Candidato = {
  tmpId: string;
  selecionado: boolean;
  data: string;
  tipo: Tipo;
  categoria: string;
  descricao: string;
  estabelecimento: string;
  /** Centavos; null enquanto o valor não foi identificado. */
  valor: number | null;
  forma: Forma;
  origem: Origem;
  dedutivel: Dedutivel;
  cnpj: string | null;
  beneficiario: string | null;
  duplicado: boolean;
  fonteCategoria: 'regra' | 'dicionario' | 'padrao' | 'manual';
  ignoravel: Ignoravel | null;
  /** Sugestão inicial, para aprender quando o usuário corrigir. */
  sugestao: { tipo: Tipo; categoria: string };
  imagem: Blob | null;
  guardarFoto: boolean;
  textoReconhecido: string | null;
};

export type ContextoCategorizacao = {
  regras: ReadonlyMap<string, CategoryRule>;
  dicionario: readonly KeywordEntry[];
};

export type BaseCandidato = {
  valor: number | null;
  data: string;
  descricao: string;
  estabelecimento?: string;
  tipo?: Tipo;
  forma?: Forma | null;
  origem: Origem;
  cnpj?: string | null;
  beneficiario?: string | null;
  imagem?: Blob | null;
  textoReconhecido?: string | null;
};

/** Foto guardada por padrão: dedutíveis (sempre) e trabalho. */
export function guardarPorPadrao(tipo: Tipo, dedutivel: Dedutivel): boolean {
  return dedutivel !== null || tipo === 'trabalho';
}

export function criarCandidato(base: BaseCandidato, ctx: ContextoCategorizacao): Candidato {
  const estabelecimento = (base.estabelecimento ?? '').trim();
  const texto = estabelecimento || base.descricao;
  const tipoBase = base.tipo ?? 'saida';
  const sug = categorizar(texto, { ...ctx, tipoPadrao: tipoBase });
  // Entradas e extraordinários informados explicitamente mantêm o tipo.
  const tipo = base.tipo && base.tipo !== 'saida' && sug.fonte === 'padrao' ? base.tipo : sug.tipo;
  const ignoravel = detectarIgnoravel(`${base.descricao} ${estabelecimento}`);
  return {
    tmpId: newId(),
    selecionado: ignoravel === null,
    data: base.data,
    tipo,
    categoria: sug.categoria,
    descricao: base.descricao.trim(),
    estabelecimento,
    valor: base.valor,
    forma: base.forma ?? 'Cartão',
    origem: base.origem,
    dedutivel: sug.dedutivel,
    cnpj: base.cnpj ?? null,
    beneficiario: base.beneficiario ?? null,
    duplicado: false,
    fonteCategoria: sug.fonte,
    ignoravel,
    sugestao: { tipo, categoria: sug.categoria },
    imagem: base.imagem ?? null,
    guardarFoto: guardarPorPadrao(tipo, sug.dedutivel),
    textoReconhecido: base.textoReconhecido ?? null,
  };
}

export function candidatoVazio(data: string): Candidato {
  return {
    tmpId: newId(),
    selecionado: true,
    data,
    tipo: 'saida',
    categoria: 'Outros',
    descricao: '',
    estabelecimento: '',
    valor: null,
    forma: 'Cartão',
    origem: 'manual',
    dedutivel: null,
    cnpj: null,
    beneficiario: null,
    duplicado: false,
    fonteCategoria: 'manual',
    ignoravel: null,
    sugestao: { tipo: 'saida', categoria: 'Outros' },
    imagem: null,
    guardarFoto: false,
    textoReconhecido: null,
  };
}

export function candidatoValido(c: Candidato): boolean {
  return c.valor !== null && c.valor > 0 && /^\d{4}-\d{2}-\d{2}$/.test(c.data) && c.categoria.length > 0;
}
