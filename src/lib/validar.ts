import type { z } from 'zod';
import { radarSchema, type Radar } from '../schema/radar';

export type ResultadoValidacao = { ok: true; radar: Radar } | { ok: false; erros: string[] };

/** Caminho legível: ["cotacoes", 3, "data_ref"] → "cotacoes[3].data_ref". */
export function caminho(path: readonly PropertyKey[]): string {
  let s = '';
  for (const p of path) {
    if (typeof p === 'number') s += `[${p}]`;
    else s += s ? `.${String(p)}` : String(p);
  }
  return s || '(raiz do arquivo)';
}

function valorEm(dados: unknown, path: readonly PropertyKey[]): unknown {
  let atual: unknown = dados;
  for (const p of path) {
    if (atual === null || typeof atual !== 'object') return undefined;
    atual = (atual as Record<PropertyKey, unknown>)[p];
  }
  return atual;
}

const TIPOS: Record<string, string> = {
  string: 'texto',
  number: 'número',
  boolean: 'verdadeiro/falso',
  array: 'lista',
  object: 'objeto',
  null: 'null',
  undefined: 'nada',
};

function tipoDe(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'lista';
  return TIPOS[typeof v] ?? typeof v;
}

function mensagem(issue: z.core.$ZodIssue, dados: unknown): string {
  const onde = caminho(issue.path);
  if (issue.code === 'invalid_type') {
    const recebido = valorEm(dados, issue.path);
    if (recebido === undefined) return `${onde}: campo obrigatório ausente`;
    return `${onde}: esperado ${TIPOS[issue.expected] ?? issue.expected}, veio ${tipoDe(recebido)}`;
  }
  if (issue.code === 'invalid_format' || issue.code === 'custom' || issue.code === 'too_small' || issue.code === 'too_big') {
    const recebido = valorEm(dados, issue.path);
    const visto = typeof recebido === 'string' || typeof recebido === 'number' ? ` (veio "${recebido}")` : '';
    return `${onde}: ${issue.message}${visto}`;
  }
  return `${onde}: valor inválido`;
}

/** Valida um objeto já lido do JSON. */
export function validarRadar(dados: unknown): ResultadoValidacao {
  const r = radarSchema.safeParse(dados);
  if (r.success) return { ok: true, radar: r.data };
  const erros = r.error.issues.map((i) => mensagem(i, dados));
  return { ok: false, erros: [...new Set(erros)].slice(0, 20) };
}

/** Valida o texto de um arquivo. */
export function validarTexto(texto: string): ResultadoValidacao & { bruto?: unknown } {
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    return { ok: false, erros: ['O arquivo não é um JSON válido (confira se não foi cortado ou editado).'] };
  }
  return { ...validarRadar(dados), bruto: dados };
}
