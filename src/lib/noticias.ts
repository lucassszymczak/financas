import type { Destaque, Fonte, Noticia, Radar } from '../schema/radar';
import { compararEdicoes, horaEdicao, tipoEdicao, chaveEdicao } from './edicoes';
import { normalizar } from './busca';
import { editoriaDe } from '../dominio/editorias';

/**
 * Fusão das notícias das edições de um dia (manhã + meio-dia).
 * Regra de "mesma notícia", em ordem de prioridade:
 *  1. `atualiza_id` de uma aponta para o `id` da outra;
 *  2. mesmo `id`;
 *  3. alguma URL de fonte em comum (normalizada);
 *  4. títulos muito parecidos (Jaccard ≥ LIMIAR_TITULO) e mesma categoria.
 */

/** Similaridade mínima de títulos (Jaccard sobre palavras) para considerar a mesma notícia. */
export const LIMIAR_TITULO = 0.6;

const STOPWORDS = new Set(
  (
    'a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela pelos pelas para pra com sem sob sobre ' +
    'e ou mas que se ao aos à às é ser são foi era como mais menos muito já até entre após antes depois seu sua seus suas ' +
    'ele ela eles elas isso isto este esta esse essa nao não'
  ).split(' '),
);

/** Palavras do título: minúsculas, sem acento, sem stopwords; números mantidos. */
export function palavrasTitulo(t: string): Set<string> {
  return new Set(
    normalizar(t)
      .split(/[^a-z0-9]+/)
      .filter((p) => p && !STOPWORDS.has(p)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** URL normalizada: minúsculas, sem protocolo, sem `www.`, sem querystring nem `#`, sem barra final. */
export function normalizarUrl(u: string): string {
  return u
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

type Comparavel = {
  id: string;
  titulo: string;
  categoria?: string | null;
  editoria?: string | null;
  resumo?: string;
  o_que?: string;
  atualiza_id?: string | null;
  fontes: Fonte[];
};

const urls = (n: Comparavel) => new Set(n.fontes.map((f) => (f.url ? normalizarUrl(f.url) : '')).filter(Boolean));

/** Por que `b` é a mesma notícia que `a`: 1 a 4 (prioridade da regra) ou 0 se não for. */
export function motivoMesma(a: Comparavel, b: Comparavel): 0 | 1 | 2 | 3 | 4 {
  if ((b.atualiza_id && b.atualiza_id === a.id) || (a.atualiza_id && a.atualiza_id === b.id)) return 1;
  if (a.id === b.id) return 2;
  const ua = urls(a);
  for (const u of urls(b)) if (ua.has(u)) return 3;
  // Título parecido só conta dentro da mesma editoria (a do arquivo ou a equivalente da categoria legada).
  const semClasse = (n: Comparavel) => !n.editoria && !n.categoria;
  if (semClasse(a) && semClasse(b)) return 0;
  if (editoriaDe(a) === editoriaDe(b) && jaccard(palavrasTitulo(a.titulo), palavrasTitulo(b.titulo)) >= LIMIAR_TITULO) return 4;
  return 0;
}

export function mesmaNoticia(a: Comparavel, b: Comparavel): boolean {
  return motivoMesma(a, b) > 0;
}

export type TipoItem = 'destaque' | 'noticia';
export type ItemDia = { tipo: 'destaque'; item: Destaque } | { tipo: 'noticia'; item: Noticia };

export type VersaoAnterior = ItemDia & { hora: string; edicao: string };

export type NoticiaFundida = ItemDia & {
  /** Chave estável para a lista (id da primeira aparição). */
  chave: string;
  /** Hora da primeira aparição ("HH:MM"). */
  primeiraHora: string;
  /** Hora da versão mostrada (atualização ou primeira aparição). */
  hora: string;
  /** Edições (tipo) em que a notícia apareceu, na ordem. */
  edicoes: string[];
  /** "original": veio na primeira edição do dia; "nova": apareceu depois; "atualizada": mudou numa edição seguinte. */
  status: 'original' | 'nova' | 'atualizada';
  /** Hora do selo "Atualizada às" / "Nova ·". */
  horaSelo: string | null;
  anteriores: VersaoAnterior[];
};

/** Hora do item: `hora` dele, senão a da edição (gerado_em em Brasília ou 07h15). */
export const horaItem = (item: { hora?: string | null }, r: Radar) => item.hora || horaEdicao(r);

function unirFontes(a: Fonte[], b: Fonte[]): Fonte[] {
  const vistos = new Set<string>();
  const r: Fonte[] = [];
  for (const f of [...b, ...a]) {
    const k = f.url ? normalizarUrl(f.url) : `nome:${f.nome}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    r.push(f);
  }
  return r;
}

/**
 * Lista única do dia: destaques e notícias de todas as edições, na ordem das edições.
 * Itens que são a mesma notícia viram um só, com a versão mais recente e as anteriores guardadas.
 */
export function fundirNoticias(edicoes: Radar[]): NoticiaFundida[] {
  const ordem = [...edicoes].sort(compararEdicoes);
  const lista: NoticiaFundida[] = [];
  ordem.forEach((r, i) => {
    const tipoEd = tipoEdicao(r);
    const daEdicao = new Set<NoticiaFundida>();
    const itens: ItemDia[] = [
      ...r.destaques.map((item) => ({ tipo: 'destaque' as const, item })),
      ...r.noticias.map((item) => ({ tipo: 'noticia' as const, item })),
    ];
    for (const novo of itens) {
      const hora = horaItem(novo.item, r);
      // Só funde com notícias de edições anteriores (dentro da mesma edição, cada item é um).
      let alvo: NoticiaFundida | null = null;
      let melhor = 9;
      for (const f of lista) {
        if (daEdicao.has(f)) continue;
        const m = motivoMesma(f.item, novo.item);
        if (m && m < melhor) {
          melhor = m;
          alvo = f;
        }
      }
      if (!alvo) {
        const f: NoticiaFundida = {
          ...novo,
          chave: `${chaveEdicao(r)}:${novo.tipo}:${novo.item.id}`,
          primeiraHora: hora,
          hora,
          edicoes: [tipoEd],
          status: i === 0 ? 'original' : 'nova',
          horaSelo: i === 0 ? null : hora,
          anteriores: [],
        };
        lista.push(f);
        daEdicao.add(f);
        continue;
      }
      const anterior = { tipo: alvo.tipo, item: alvo.item, hora: alvo.hora, edicao: alvo.edicoes.at(-1)! } as VersaoAnterior;
      const horaAtualizacao = novo.item.atualizado_em || horaEdicao(r);
      Object.assign(alvo, {
        tipo: novo.tipo,
        item: { ...novo.item, fontes: unirFontes(alvo.item.fontes, novo.item.fontes) },
        hora: horaAtualizacao,
        edicoes: [...alvo.edicoes, tipoEd],
        status: 'atualizada',
        horaSelo: horaAtualizacao,
        anteriores: [anterior, ...alvo.anteriores],
      });
      daEdicao.add(alvo);
    }
  });
  // Destaques primeiro, depois as demais; dentro de cada grupo, as mais recentes no topo.
  return lista.sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'destaque' ? -1 : 1) || b.hora.localeCompare(a.hora) || 0);
}

export type FiltroNoticias = 'todas' | 'manha' | 'meio_dia' | 'novas';

export function filtrarNoticias(lista: NoticiaFundida[], f: FiltroNoticias): NoticiaFundida[] {
  if (f === 'manha') return lista.filter((n) => n.edicoes.includes('manha'));
  if (f === 'meio_dia') return lista.filter((n) => n.edicoes.includes('atualizacao_meio_dia'));
  if (f === 'novas') return lista.filter((n) => n.status !== 'original');
  return lista;
}

/** Notícia de uma lista com a data da edição em que apareceu por último. */
export type NoticiaListada = NoticiaFundida & { data: string };

/**
 * Notícias de vários dias (filtro "Últimos 7/30 dias"): junta as edições de cada dia e, entre dias,
 * a mesma notícia (regra de `mesmaNoticia`) aparece uma vez só, na versão mais recente.
 */
export function noticiasDoPeriodo(dias: { data: string; edicoes: Radar[] }[]): NoticiaListada[] {
  const lista: NoticiaListada[] = [];
  for (const d of [...dias].sort((a, b) => a.data.localeCompare(b.data))) {
    for (const n of fundirNoticias(d.edicoes)) {
      const i = lista.findIndex((x) => mesmaNoticia(x.item, n.item));
      const novo = { ...n, data: d.data };
      if (i >= 0) lista[i] = novo;
      else lista.push(novo);
    }
  }
  return lista;
}
