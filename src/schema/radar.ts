import { z } from 'zod';

/**
 * Contrato de dados do arquivo diário `radar_AAAA-MM-DD.json`.
 * Documentado em docs/schema.md: qualquer mudança aqui precisa ir para lá também.
 *
 * Regras gerais:
 * - Campos desconhecidos são ignorados (o z.object padrão os descarta).
 * - `null` é válido em todo campo de valor e significa "não verificado" (o app mostra "—").
 * - Listas ausentes viram listas vazias.
 */

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data inválida (use AAAA-MM-DD)');
const numero = z.number().nullable().optional();
const texto = z.string().nullable().optional();
const nota = z.number().min(0, 'nota mínima é 0').max(5, 'nota máxima é 5').nullable().optional();

export const fonteSchema = z.object({
  nome: z.string(),
  url: texto,
  nota,
});

const comuns = {
  ativos_afetados: z.array(z.string()).default([]),
  impacto: texto,
  horizonte: texto,
  confianca: texto,
  fontes: z.array(fonteSchema).default([]),
};

export const destaqueSchema = z.object({
  id: z.string(),
  emoji: texto,
  titulo: z.string(),
  categoria: texto,
  o_que: z.string(),
  por_que: texto,
  o_que_muda: texto,
  ...comuns,
});

export const noticiaSchema = z.object({
  id: z.string(),
  emoji: texto,
  titulo: z.string(),
  data: dataISO.nullable().optional(),
  categoria: texto,
  resumo: z.string(),
  por_que_importa: texto,
  ...comuns,
});

const precoComum = {
  id: z.string().min(1, 'id vazio'),
  nome: z.string(),
  nome_curto: texto,
  valor: numero,
  unidade: texto,
  variacao_pct: numero,
  variacao_pb: numero,
  data_ref: dataISO.nullable().optional(),
  periodo: texto,
  fonte: texto,
  url: texto,
  nota_fonte: nota,
  kpi: z.boolean().nullable().optional(),
};

export const cotacaoSchema = z.object({ ...precoComum, grupo: z.string() });
export const agroSchema = z.object({ ...precoComum, regiao: z.string() });

export const taxasSchema = z.object({
  selic_meta: numero,
  cdi_anual: numero,
  ipca_12m: numero,
  observacao: texto,
});

export const previsaoDiaSchema = z.object({
  data: dataISO,
  min: numero,
  max: numero,
  chuva_mm: numero,
  prob_chuva: numero,
  condicao: texto,
});

export const alertaClimaSchema = z.object({
  tipo: z.string(),
  nivel: z.string(),
  texto: z.string(),
  inicio: dataISO.nullable().optional(),
  fim: dataISO.nullable().optional(),
  fonte: texto,
});

export const regiaoClimaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  resumo: texto,
  previsao: z.array(previsaoDiaSchema).default([]),
  alertas: z.array(alertaClimaSchema).default([]),
  fonte: texto,
  url: texto,
});

export const climaSchema = z.object({
  enso: z
    .object({
      fase: texto,
      intensidade: texto,
      texto: texto,
      data_ref: dataISO.nullable().optional(),
      fonte: texto,
      url: texto,
    })
    .nullable()
    .optional(),
  regioes: z.array(regiaoClimaSchema).default([]),
  no_campo: texto,
});

export const eventoAgendaSchema = z.object({
  data: dataISO,
  hora: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'hora inválida (use HH:MM)')
    .nullable()
    .optional(),
  fuso: texto,
  pais: texto,
  evento: z.string(),
  o_que_mede: texto,
  expectativa: texto,
  relevancia: texto,
  fonte: texto,
  url: texto,
});

export const radarSchema = z.object({
  schema_version: z.string(),
  edicao: z.object({
    data: dataISO,
    dia_semana: texto,
    gerado_em: texto,
    referencia_mercado: texto,
    titulo: texto,
  }),
  termometro: z.object({ tom: texto, texto: z.string() }).nullable().optional(),
  destaques: z.array(destaqueSchema).default([]),
  noticias: z.array(noticiaSchema).default([]),
  leitura_do_dia: texto,
  leituras_secao: z.record(z.string(), z.string().nullable()).nullable().optional(),
  cotacoes: z.array(cotacaoSchema).default([]),
  agro: z.array(agroSchema).default([]),
  taxas_referencia: taxasSchema.nullable().optional(),
  clima: climaSchema.nullable().optional(),
  agenda: z.array(eventoAgendaSchema).default([]),
  limitacoes: z.array(z.string()).default([]),
  aviso: texto,
});

export type Radar = z.infer<typeof radarSchema>;
export type Fonte = z.infer<typeof fonteSchema>;
export type Destaque = z.infer<typeof destaqueSchema>;
export type Noticia = z.infer<typeof noticiaSchema>;
export type Cotacao = z.infer<typeof cotacaoSchema>;
export type ItemAgro = z.infer<typeof agroSchema>;
export type Taxas = z.infer<typeof taxasSchema>;
export type RegiaoClima = z.infer<typeof regiaoClimaSchema>;
export type AlertaClima = z.infer<typeof alertaClimaSchema>;
export type EventoAgenda = z.infer<typeof eventoAgendaSchema>;

/** Qualquer item com preço: cotação, agro ou taxa de referência. */
export type Preco = Omit<Cotacao, 'grupo'> & { grupo?: string; regiao?: string };
