import { z } from 'zod';

/* Todos os valores monetários são centavos inteiros. */
const cents = z.number().int();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const month = z.string().regex(/^\d{4}-\d{2}$/);

export const TIPOS = ['saida', 'entrada', 'trabalho', 'extra_in', 'extra_out'] as const;
export const FORMAS = ['Cartão', 'Conta / Pix', 'Dinheiro'] as const;
export const ORIGENS = ['foto', 'print', 'extrato', 'texto', 'manual', 'fixo', 'importacao'] as const;
export const DEDUTIVEIS = ['saude', 'educacao'] as const;
export const PAPEIS_DIVIDA = ['consignado', 'cdc', 'acordo', 'outra'] as const;
export const MODOS_LONGEVIDADE = ['2/2', '6/6'] as const;

export const tipoSchema = z.enum(TIPOS);
export const formaSchema = z.enum(FORMAS);
export const origemSchema = z.enum(ORIGENS);
export const dedutivelSchema = z.enum(DEDUTIVEIS).nullable();
export const papelSchema = z.enum(PAPEIS_DIVIDA);
export const modoLongevidadeSchema = z.enum(MODOS_LONGEVIDADE);

export const projecaoSchema = z.object({
  /** Fluxo mensal manual para a simulação; null = usar a média dos meses fechados. */
  resultadoManual: cents.nullable(),
  pisoReserva: cents,
  decimoNov: cents,
  decimoDez: cents,
  plrMarco: cents,
  restituicaoJunho: cents,
  /** Mês ('YYYY-MM') em que o Longevidade passa a 6/6 na simulação; null = não sobe. */
  janelaLongevidade: month.nullable(),
});

export const settingsSchema = z.object({
  id: z.literal('main'),
  reserva: cents,
  capital: cents,
  longevidadeModo: modoLongevidadeSchema,
  salarioBaseLongevidade: cents,
  ultimoMesAplicado: month.nullable(),
  jurosPagos: cents,
  fipeCarro: cents,
  projecao: projecaoSchema,
  tetos: z.record(z.string(), cents),
  ultimoBackup: z.string().nullable(),
  ultimoRestauro: z.string().nullable(),
  tema: z.enum(['auto', 'light', 'dark']).default('auto'),
});

export const debtSchema = z.object({
  id: z.string().min(1),
  nome: z.string(),
  papel: papelSchema,
  saldo: cents,
  /** Taxa mensal em %, por exemplo 1.85. */
  taxaMensal: z.number().min(0),
  parcela: cents,
  ordem: z.number().int(),
  ativo: z.boolean(),
});

export const fixedItemSchema = z.object({
  id: z.string().min(1),
  tipo: z.enum(['saida', 'entrada']),
  categoria: z.string(),
  descricao: z.string(),
  valor: cents,
  ativo: z.boolean(),
});

export const transactionSchema = z.object({
  id: z.string().min(1),
  data: isoDate,
  mes: month,
  tipo: tipoSchema,
  categoria: z.string(),
  descricao: z.string(),
  estabelecimento: z.string(),
  valor: cents.positive(),
  forma: formaSchema,
  origem: origemSchema,
  fixoId: z.string().nullable(),
  dedutivel: dedutivelSchema,
  cnpj: z.string().nullable(),
  beneficiario: z.string().nullable(),
  /** Só para tipo 'trabalho': reembolso já recebido. */
  reembolsado: z.boolean(),
  reembolsadoEm: isoDate.nullable().default(null),
  comprovanteId: z.string().nullable(),
  comprovantePendente: z.boolean(),
  criadoEm: z.string(),
});

export const receiptMetaSchema = z.object({
  id: z.string().min(1),
  criadoEm: z.string(),
  tipoArquivo: z.string().default('image/jpeg'),
});

export const categoryRuleSchema = z.object({
  chave: z.string().min(1),
  tipo: tipoSchema,
  categoria: z.string(),
  atualizadoEm: z.string(),
});

export const keywordEntrySchema = z.object({
  id: z.string().min(1),
  palavra: z.string().min(1),
  tipo: tipoSchema,
  categoria: z.string(),
  dedutivel: dedutivelSchema,
});

export const csvMappingSchema = z.object({
  banco: z.string().min(1),
  separador: z.enum([';', ',', '\t']),
  temCabecalho: z.boolean(),
  colData: z.number().int().min(0),
  colDescricao: z.number().int().min(0),
  colValor: z.number().int().min(0),
  formatoData: z.enum(['dd/mm/aaaa', 'aaaa-mm-dd']),
  formatoValor: z.enum(['br', 'us']),
  /** Se true, valores positivos no arquivo são saídas (comum em faturas de cartão). */
  positivoEhSaida: z.boolean(),
});

export const closingSchema = z.object({
  mes: month,
  texto: z.string(),
  criadoEm: z.string(),
});

export const snapshotSchema = z.object({
  mes: month,
  reserva: cents,
  capital: cents,
  dividas: z.array(z.object({ id: z.string(), nome: z.string(), saldo: cents })),
  jurosDoMes: cents,
});

export type Tipo = z.infer<typeof tipoSchema>;
export type Forma = z.infer<typeof formaSchema>;
export type Origem = z.infer<typeof origemSchema>;
export type Dedutivel = z.infer<typeof dedutivelSchema>;
export type PapelDivida = z.infer<typeof papelSchema>;
export type ModoLongevidade = z.infer<typeof modoLongevidadeSchema>;
export type Projecao = z.infer<typeof projecaoSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Debt = z.infer<typeof debtSchema>;
export type FixedItem = z.infer<typeof fixedItemSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type ReceiptMeta = z.infer<typeof receiptMetaSchema>;
export type Receipt = ReceiptMeta & { blob: Blob };
export type CategoryRule = z.infer<typeof categoryRuleSchema>;
export type KeywordEntry = z.infer<typeof keywordEntrySchema>;
export type CsvMapping = z.infer<typeof csvMappingSchema>;
export type Closing = z.infer<typeof closingSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
