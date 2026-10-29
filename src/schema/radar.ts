import { z } from 'zod';
import { ehEditoria, SLUGS_EDITORIA, type EditoriaSlug } from '../dominio/editorias';

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
/** "HH:MM" (horário de Brasília). */
const hora = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'hora inválida (use HH:MM)')
  .nullable()
  .optional();

/** Tipos de edição conhecidos; outros valores são aceitos e guardados separadamente. */
export const TIPOS_EDICAO = ['manha', 'atualizacao_meio_dia'] as const;

/** Slug de editoria; um valor desconhecido não invalida o arquivo: vira `outras`, com aviso no console. */
const editoria = z
  .string()
  .nullable()
  .transform((v): EditoriaSlug | null => {
    if (v === null || ehEditoria(v)) return v;
    console.warn(`[Radar] Editoria desconhecida "${v}": tratada como "outras". Conhecidas: ${SLUGS_EDITORIA.join(', ')}.`);
    return 'outras';
  })
  .optional();

/** Nota de relevância de 0 a 3 (total de 0 a 12). */
const notaRelevancia = (max: number) =>
  z.number().int('nota inteira').min(0).max(max, `nota máxima é ${max}`).nullable().optional();

export const relevanciaSchema = z.object({
  mercado: notaRelevancia(3),
  sistema_financeiro: notaRelevancia(3),
  regiao_agro: notaRelevancia(3),
  novidade: notaRelevancia(3),
  total: notaRelevancia(12),
});

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
  // Edições do dia (meio-dia): horário do item e ligação com o item que ele atualiza.
  hora,
  atualiza_id: texto,
  atualizado_em: hora,
  // Notícias por editoria (a partir de 29/10/2026); edições antigas usam só `categoria`.
  editoria,
  relevancia: relevanciaSchema.nullable().optional(),
  /** Só em `politica_regulacao`: por onde a notícia chega ao mercado (ex.: "fiscal → curva de juros"). */
  canal_transmissao: texto,
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
  /** Hora da cotação intradiária ("HH:MM"); sem ela, o valor é de fechamento. */
  hora_ref: hora,
  observacao: texto,
  periodo: texto,
  fonte: texto,
  url: texto,
  nota_fonte: nota,
  kpi: z.boolean().nullable().optional(),
  // Detalhes opcionais do pregão (mostrados no pop-up do ativo quando vierem).
  setor: texto,
  abertura: numero,
  maxima: numero,
  minima: numero,
  fechamento_anterior: numero,
  volume_financeiro: numero,
  var_semana_pct: numero,
  var_mes_pct: numero,
  var_ano_pct: numero,
  var_12m_pct: numero,
  minima_52s: numero,
  maxima_52s: numero,
};

export const cotacaoSchema = z.object({ ...precoComum, grupo: z.string() });
export const agroSchema = z.object({ ...precoComum, regiao: z.string() });

/**
 * Universo amplo de cotações do dia (opcional). Não entra na fita "Principais", nos KPIs nem no texto do Radar:
 * alimenta a busca, o Mercado → Todos, a watchlist e o histórico.
 * `data_ref`, `fonte` e `url` do bloco valem para os itens que não trouxerem os próprios.
 */
export const cotacoesAmplasSchema = z.object({
  data_ref: dataISO.nullable().optional(),
  hora_ref: hora,
  fonte: texto,
  url: texto,
  nota_fonte: nota,
  itens: z.array(cotacaoSchema.extend({ nome: z.string().optional() })).default([]),
});

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
    /** Ausente = "manha". Conhecidos: "manha", "atualizacao_meio_dia". */
    tipo: texto,
    referencia_mercado: texto,
    titulo: texto,
    /** Edição fictícia de demonstração. */
    exemplo: z.boolean().nullable().optional(),
  }),
  termometro: z.object({ tom: texto, texto: z.string() }).nullable().optional(),
  destaques: z.array(destaqueSchema).default([]),
  noticias: z.array(noticiaSchema).default([]),
  /** Editorias sem notícia relevante no dia (slugs desconhecidos são descartados). */
  editorias_sem_destaque: z
    .array(z.string())
    .nullable()
    .transform((l) => (l ? l.filter(ehEditoria) : l))
    .optional(),
  leitura_do_dia: texto,
  leituras_secao: z.record(z.string(), z.string().nullable()).nullable().optional(),
  cotacoes: z.array(cotacaoSchema).default([]),
  agro: z.array(agroSchema).default([]),
  cotacoes_amplas: cotacoesAmplasSchema.nullable().optional(),
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
export type CotacoesAmplas = z.infer<typeof cotacoesAmplasSchema>;
export type RegiaoClima = z.infer<typeof regiaoClimaSchema>;
export type AlertaClima = z.infer<typeof alertaClimaSchema>;
export type EventoAgenda = z.infer<typeof eventoAgendaSchema>;

/** Qualquer item com preço: cotação, agro ou taxa de referência. */
export type Preco = Omit<Cotacao, 'grupo'> & {
  grupo?: string;
  regiao?: string;
  /** Preenchido na fusão do dia quando o valor veio de uma edição anterior (a nova trouxe null). */
  herdado?: { edicao: string; hora: string | null };
};
