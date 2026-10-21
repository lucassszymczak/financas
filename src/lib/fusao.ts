import type { Cotacao, Destaque, ItemAgro, Noticia, Preco, Radar } from '../schema/radar';
import { compararEdicoes, horaEdicao, rotuloTipo } from './edicoes';
import { fundirNoticias } from './noticias';

/**
 * Fusão das edições de um mesmo dia num único Radar (o "dia completo").
 * Cotações: por `id`, campo a campo; a edição mais recente ganha, mas um `null` nela não apaga
 * um valor verificado da anterior (o item fica marcado com `herdado`, para mostrar data e hora).
 */

const definido = (v: unknown) => v !== null && v !== undefined;

/** O mínimo que a fusão usa de um item com preço (o bloco amplo tem `nome` opcional). */
type Base = Omit<Preco, 'nome'> & { nome?: string };

/** Campos que acompanham o valor: se o valor vier da edição anterior, eles vêm junto. */
const CAMPOS_DO_VALOR = ['valor', 'data_ref', 'hora_ref', 'observacao', 'variacao_pct', 'variacao_pb'] as const;

function fundirItem<T extends Base>(anterior: T, novo: T, rAnterior: Radar): T {
  const r = { ...anterior } as Record<string, unknown>;
  for (const [k, v] of Object.entries(novo)) if (definido(v)) r[k] = v;
  if (!definido(novo.valor) && definido(anterior.valor)) {
    for (const k of CAMPOS_DO_VALOR) r[k] = anterior[k];
    r.herdado = anterior.herdado ?? { edicao: rotuloTipo(rAnterior), hora: anterior.hora_ref ?? horaEdicao(rAnterior) };
  } else if (definido(novo.valor)) {
    delete r.herdado;
  }
  return r as T;
}

/** Junta listas de itens de várias edições (da mais antiga para a mais recente), mantendo a ordem de aparição. */
export function fundirPrecos<T extends Base>(porEdicao: { radar: Radar; itens: T[] }[]): T[] {
  const mapa = new Map<string, { item: T; radar: Radar }>();
  for (const { radar, itens } of porEdicao) {
    for (const it of itens) {
      const ant = mapa.get(it.id);
      if (!ant) mapa.set(it.id, { item: { ...it }, radar });
      else {
        const fundido = fundirItem(ant.item, it, ant.radar);
        // A origem do valor continua sendo a edição anterior quando ele foi herdado.
        mapa.set(it.id, { item: fundido, radar: definido(it.valor) ? radar : ant.radar });
      }
    }
  }
  return [...mapa.values()].map((v) => v.item);
}

/** Itens do bloco amplo com data, hora, fonte e url do bloco já aplicados. */
function itensAmplos(r: Radar) {
  const b = r.cotacoes_amplas;
  if (!b) return [];
  return b.itens.map((i) => ({
    ...i,
    data_ref: i.data_ref ?? b.data_ref ?? null,
    hora_ref: i.hora_ref ?? b.hora_ref ?? null,
    fonte: i.fonte ?? b.fonte ?? null,
    url: i.url ?? b.url ?? null,
    nota_fonte: i.nota_fonte ?? b.nota_fonte ?? null,
  }));
}

function ultimoDefinido<T>(lista: Radar[], f: (r: Radar) => T | null | undefined): T | null {
  for (let i = lista.length - 1; i >= 0; i--) {
    const v = f(lista[i]!);
    if (definido(v)) return v as T;
  }
  return null;
}

/** Radar do dia completo. Com uma edição só, devolve ela mesma. */
export function fundirDia(edicoes: Radar[]): Radar {
  if (edicoes.length <= 1) return edicoes[0]!;
  const ord = [...edicoes].sort(compararEdicoes);
  const ultima = ord.at(-1)!;
  const noticias = fundirNoticias(ord);
  const temAmplas = ord.some((r) => r.cotacoes_amplas);
  const taxas = ord.map((r) => r.taxas_referencia).filter(Boolean);
  const leituras: Record<string, string | null> = {};
  for (const r of ord) for (const [k, v] of Object.entries(r.leituras_secao ?? {})) if (v) leituras[k] = v;

  return {
    ...ultima,
    edicao: {
      ...ultima.edicao,
      referencia_mercado: ultimoDefinido(ord, (r) => r.edicao.referencia_mercado),
      titulo: ultimoDefinido(ord, (r) => r.edicao.titulo),
    },
    termometro: ultimoDefinido(ord, (r) => r.termometro),
    leitura_do_dia: ultimoDefinido(ord, (r) => r.leitura_do_dia),
    leituras_secao: Object.keys(leituras).length ? leituras : null,
    destaques: noticias.filter((n) => n.tipo === 'destaque').map((n) => n.item as Destaque),
    noticias: noticias.filter((n) => n.tipo === 'noticia').map((n) => n.item as Noticia),
    cotacoes: fundirPrecos<Cotacao>(ord.map((radar) => ({ radar, itens: radar.cotacoes }))),
    agro: fundirPrecos<ItemAgro>(ord.map((radar) => ({ radar, itens: radar.agro }))),
    cotacoes_amplas: temAmplas
      ? {
          data_ref: null,
          hora_ref: null,
          fonte: null,
          url: null,
          nota_fonte: null,
          itens: fundirPrecos<ReturnType<typeof itensAmplos>[number]>(ord.map((radar) => ({ radar, itens: itensAmplos(radar) }))),
        }
      : null,
    taxas_referencia: taxas.length
      ? taxas.reduce((acc, t) => {
          const r = { ...acc } as Record<string, unknown>;
          for (const [k, v] of Object.entries(t!)) if (definido(v)) r[k] = v;
          return r as typeof acc;
        })
      : null,
    clima: ultimoDefinido(ord, (r) => r.clima),
    agenda: ultimoDefinido(ord, (r) => (r.agenda.length ? r.agenda : null)) ?? [],
    limitacoes: [...new Set(ord.flatMap((r) => r.limitacoes))],
    aviso: ultimoDefinido(ord, (r) => r.aviso),
  };
}
