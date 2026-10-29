import { normalizar } from '../lib/busca';

/**
 * Editorias das notícias: fonte única de slugs, rótulos, ícones e ordem de exibição.
 * Edições a partir de 29/10/2026 trazem `editoria` em cada notícia; as antigas só têm `categoria`,
 * que `editoriaDe` mapeia para a editoria equivalente.
 */

export const SLUGS_EDITORIA = [
  'bancos_cooperativas',
  'mercados',
  'economia',
  'business',
  'financas_produtos',
  'agro',
  'tecnologia_energia',
  'mundo',
  'politica_regulacao',
  'outras',
] as const;

export type EditoriaSlug = (typeof SLUGS_EDITORIA)[number];

export type Editoria = {
  slug: EditoriaSlug;
  rotulo: string;
  curto: string;
  icone: string;
  /** Escopo resumido, mostrado no cabeçalho da página da editoria. */
  descricao: string;
};

/** Na ordem fixa de exibição. `outras` é interna: só aparece quando tem itens. */
export const EDITORIAS: Editoria[] = [
  {
    slug: 'bancos_cooperativas',
    rotulo: 'Bancos e cooperativas',
    curto: 'Bancos e coops',
    icone: '🏦',
    descricao: 'Bancos, cooperativas de crédito, Banco Central e sistema financeiro.',
  },
  {
    slug: 'mercados',
    rotulo: 'Mercados',
    curto: 'Mercados',
    icone: '📈',
    descricao: 'Bolsa, juros, câmbio, commodities e fluxo de investidores.',
  },
  {
    slug: 'economia',
    rotulo: 'Economia',
    curto: 'Economia',
    icone: '🧮',
    descricao: 'Atividade, inflação, emprego, contas públicas e indicadores.',
  },
  {
    slug: 'business',
    rotulo: 'Business e empresas',
    curto: 'Business',
    icone: '🏢',
    descricao: 'Empresas, resultados, fusões, aquisições e estratégia.',
  },
  {
    slug: 'financas_produtos',
    rotulo: 'Finanças e produtos',
    curto: 'Finanças',
    icone: '💰',
    descricao: 'Produtos de investimento, crédito, seguros e finanças pessoais.',
  },
  { slug: 'agro', rotulo: 'Agro', curto: 'Agro', icone: '🌾', descricao: 'Safra, preços agrícolas, pecuária e cadeia do agro.' },
  {
    slug: 'tecnologia_energia',
    rotulo: 'Tecnologia, IA e energia',
    curto: 'Tech e energia',
    icone: '🤖',
    descricao: 'Tecnologia, inteligência artificial, energia e transição energética.',
  },
  {
    slug: 'mundo',
    rotulo: 'Mundo',
    curto: 'Mundo',
    icone: '🌍',
    descricao: 'Economia e mercados internacionais, bancos centrais e geopolítica.',
  },
  {
    slug: 'politica_regulacao',
    rotulo: 'Política e regulação',
    curto: 'Política e regulação',
    icone: '🏛️',
    descricao: 'Congresso, governo, Justiça e regulação que afetam a economia.',
  },
  { slug: 'outras', rotulo: 'Outras', curto: 'Outras', icone: '🗞️', descricao: 'Notícias sem editoria definida.' },
];

const POR_SLUG = new Map(EDITORIAS.map((e) => [e.slug, e]));

export const ehEditoria = (s: unknown): s is EditoriaSlug => typeof s === 'string' && POR_SLUG.has(s as EditoriaSlug);

export const editoria = (slug: EditoriaSlug): Editoria => POR_SLUG.get(slug)!;

/** Cor de acento da editoria (variável CSS definida em tokens.css para os dois temas). */
export const corEditoria = (slug: EditoriaSlug) => `var(--ed-${slug.replace(/_/g, '-')})`;

/** Palavras que levam uma notícia legada de "brasil" para Política e regulação. */
const POLITICA =
  /\b(camara|senado|stf|supremo|pec|projeto de lei|congresso|eleicao|eleicoes|eleitoral|ministro|ministra|planalto|mp|medida provisoria|decreto)\b/;

type ComEditoria = {
  editoria?: string | null;
  categoria?: string | null;
  titulo?: string;
  resumo?: string;
  o_que?: string;
};

/**
 * Editoria de uma notícia ou destaque: a do arquivo, quando válida; senão, a equivalente da `categoria`
 * das edições antigas; e `outras` para o resto.
 */
export function editoriaDe(item: ComEditoria): EditoriaSlug {
  if (ehEditoria(item.editoria)) return item.editoria;
  switch (normalizar(item.categoria ?? '').trim()) {
    case 'mercado':
    case 'mercados':
      return 'mercados';
    case 'mundo':
      return 'mundo';
    case 'agro':
      return 'agro';
    case 'brasil': {
      const t = normalizar(`${item.titulo ?? ''} ${item.resumo ?? item.o_que ?? ''}`);
      return POLITICA.test(t) ? 'politica_regulacao' : 'economia';
    }
    default:
      return 'outras';
  }
}

export type Relevancia = {
  mercado?: number | null;
  sistema_financeiro?: number | null;
  regiao_agro?: number | null;
  novidade?: number | null;
  total?: number | null;
};

/** Nota total de relevância (0 a 12) que veio no arquivo; `null` quando não veio (nunca inventa nota). */
export function relevanciaTotal(item: { relevancia?: Relevancia | null }): number | null {
  const t = item.relevancia?.total;
  return typeof t === 'number' && Number.isFinite(t) ? t : null;
}

/** Item exibido nas listas de notícias, com a data e a hora usadas para ordenar. */
export type ComOrdem = { item: ComEditoria & { relevancia?: Relevancia | null }; data: string; hora: string };

export type ModoOrdem = 'relevancia' | 'recentes';

const instante = (x: ComOrdem) => `${x.data}T${x.hora}`;

/**
 * Ordenação das notícias. "relevancia": nota total decrescente, empate pela mais recente;
 * itens sem nota vão depois dos que têm, do mais recente para o mais antigo. "recentes": só data e hora.
 */
export function ordenarNoticias<T extends ComOrdem>(itens: T[], modo: ModoOrdem = 'relevancia'): T[] {
  return [...itens].sort((a, b) => {
    if (modo === 'relevancia') {
      const ra = relevanciaTotal(a.item);
      const rb = relevanciaTotal(b.item);
      if (ra !== null || rb !== null) {
        if (ra === null) return 1;
        if (rb === null) return -1;
        if (ra !== rb) return rb - ra;
      }
    }
    return instante(b).localeCompare(instante(a));
  });
}

/** Máximo de notícias por editoria combinado com a rotina; acima disso, só um aviso de qualidade. */
export const MAX_POR_EDITORIA = 4;

export type GrupoEditoria<T> = { editoria: Editoria; itens: T[]; semDestaque: boolean };

/**
 * Agrupa por editoria na ordem fixa. As 9 editorias aparecem sempre (vazias também: a ausência é informação);
 * `outras` só quando tiver itens. Em desenvolvimento, avisa quando uma editoria passa de 4 itens (sem cortar).
 */
export function agruparPorEditoria<T extends { item: ComEditoria }>(
  itens: T[],
  semDestaque: readonly string[] = [],
): GrupoEditoria<T>[] {
  const mapa = new Map<EditoriaSlug, T[]>(EDITORIAS.map((e) => [e.slug, []]));
  for (const x of itens) mapa.get(editoriaDe(x.item))!.push(x);
  if (import.meta.env.DEV) {
    for (const [slug, lista] of mapa)
      if (lista.length > MAX_POR_EDITORIA)
        console.warn(`[Radar] Editoria "${slug}" com ${lista.length} itens (o combinado é no máximo ${MAX_POR_EDITORIA}).`);
  }
  return EDITORIAS.filter((e) => e.slug !== 'outras' || mapa.get('outras')!.length).map((e) => ({
    editoria: e,
    itens: mapa.get(e.slug)!,
    semDestaque: semDestaque.includes(e.slug),
  }));
}

/** Contagem por editoria (para o menu e os chips). */
export function contarPorEditoria(itens: { item: ComEditoria }[]): Record<EditoriaSlug, number> {
  const c = Object.fromEntries(SLUGS_EDITORIA.map((s) => [s, 0])) as Record<EditoriaSlug, number>;
  for (const x of itens) c[editoriaDe(x.item)]++;
  return c;
}
