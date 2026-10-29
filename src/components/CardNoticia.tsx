import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Destaque, Noticia } from '../schema/radar';
import type { VersaoAnterior } from '../lib/noticias';
import { corEditoria, editoria, editoriaDe, type EditoriaSlug, type Relevancia } from '../dominio/editorias';
import { horaBR } from '../lib/edicoes';
import { diaMes } from '../lib/formato';
import { ListaFontes, Selo, type TomSelo } from './Basicos';
import { Modal } from './Modal';

const TOM_IMPACTO: Record<string, TomSelo> = { positivo: 'positivo', negativo: 'negativo', misto: 'misto', neutro: 'neutro' };
const ROTULO_CONFIANCA: Record<string, string> = { alta: 'alta', media: 'média', baixa: 'baixa' };

export type ItemNoticia = Destaque | Noticia;
export const ehNoticia = (i: ItemNoticia): i is Noticia => 'resumo' in i;
export const textoVisivel = (i: ItemNoticia) => (ehNoticia(i) ? i.resumo : i.o_que);

/** Estilo com a cor de acento da editoria (filete lateral e selo). */
export const estiloEditoria = (slug: EditoriaSlug) => ({ '--ed': corEditoria(slug) }) as CSSProperties;

/** Selo da editoria: ícone + nome, na cor de acento dela. */
export function BadgeEditoria({ slug, curto = false }: { slug: EditoriaSlug; curto?: boolean }) {
  const e = editoria(slug);
  return (
    <span className="badge-editoria" style={estiloEditoria(slug)}>
      <span aria-hidden="true">{e.icone}</span> {curto ? e.curto : e.rotulo}
    </span>
  );
}

const NOTAS: [keyof Relevancia, string][] = [
  ['mercado', 'Mercado'],
  ['sistema_financeiro', 'Sistema financeiro'],
  ['regiao_agro', 'Região/agro'],
  ['novidade', 'Novidade'],
];

/** Relevância em quatro mini-barras (0 a 3) e o total. Sem relevância no arquivo, não mostra nada. */
export function IndicadorRelevancia({ relevancia }: { relevancia?: Relevancia | null }) {
  if (!relevancia || typeof relevancia.total !== 'number') return null;
  const texto = [...NOTAS.map(([k, n]) => `${n} ${relevancia[k] ?? '—'}`), `Total ${relevancia.total}`].join(' · ');
  return (
    <span className="relevancia" title={texto} role="img" aria-label={`Relevância: ${texto}`}>
      <span className="relevancia-barras" aria-hidden="true">
        {NOTAS.map(([k]) => (
          <i key={k} style={{ height: `${(Math.max(0, Math.min(3, relevancia[k] ?? 0)) / 3) * 100}%` }} />
        ))}
      </span>
      <span className="relevancia-total" aria-hidden="true">
        {relevancia.total}
      </span>
    </span>
  );
}

/** Conteúdo completo de uma notícia ou destaque (usado no pop-up e no card da página Notícias). */
export function DetalheNoticia({
  item,
  anteriores,
  semVisivel = false,
}: {
  item: ItemNoticia;
  anteriores?: VersaoAnterior[];
  semVisivel?: boolean;
}) {
  const blocos: [string, string | null | undefined][] = ehNoticia(item)
    ? [['Por que importa', item.por_que_importa]]
    : [
        ['Por que aconteceu', item.por_que],
        ['O que muda', item.o_que_muda],
      ];
  return (
    <div className="noticia-detalhe">
      {!semVisivel && <p className="noticia-oque">{textoVisivel(item)}</p>}
      {item.canal_transmissao && (
        <p className="noticia-canal">
          <strong>Canal:</strong> {item.canal_transmissao}
        </p>
      )}
      {blocos.map(([titulo, texto]) =>
        texto ? (
          <div key={titulo}>
            <h4>{titulo}</h4>
            <p>{texto}</p>
          </div>
        ) : null,
      )}
      {item.ativos_afetados.length > 0 && (
        <div>
          <h4>Ativos afetados</h4>
          <div className="chips">
            {item.ativos_afetados.map((a) => (
              <span key={a} className="chip">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
      {(item.horizonte || item.confianca || item.impacto) && (
        <div className="selos">
          {item.impacto && <Selo tom={TOM_IMPACTO[item.impacto] ?? 'neutro'}>Impacto: {item.impacto}</Selo>}
          {item.horizonte && <Selo>Horizonte: {item.horizonte}</Selo>}
          {item.confianca && <Selo tom="info">Confiança: {ROTULO_CONFIANCA[item.confianca] ?? item.confianca}</Selo>}
        </div>
      )}
      {item.fontes.length > 0 && (
        <div>
          <h4>Fontes</h4>
          <ListaFontes fontes={item.fontes} />
        </div>
      )}
      {anteriores?.map((v) => (
        <details key={`${v.edicao}-${v.hora}`} className="versao-anterior">
          <summary>Versão das {horaBR(v.hora)}</summary>
          <p>
            <strong>{v.item.titulo}</strong>
          </p>
          <p>{textoVisivel(v.item)}</p>
          {v.item.impacto && <p className="mudo pequeno">Impacto: {v.item.impacto}</p>}
        </details>
      ))}
    </div>
  );
}

/** Título do pop-up: emoji + título. */
export const TituloNoticia = ({ item }: { item: ItemNoticia }) => (
  <>
    {item.emoji && <span aria-hidden="true">{item.emoji} </span>}
    {item.titulo}
  </>
);

/** Extras da fusão do dia: selo ("Nova · 12h30", "Atualizada às 12h45") e versões anteriores. */
type Extras = { selo?: ReactNode; anteriores?: VersaoAnterior[] };
type Props = ({ item: Destaque } | { item: Noticia; noticia: true }) & Extras;

/** Card de destaque ou notícia. Ao tocar, o detalhe abre num pop-up. */
export function CardNoticia(props: Props) {
  const [aberto, setAberto] = useState(false);
  const { item } = props;
  const slug = editoriaDe(item);
  const data = ehNoticia(item) ? item.data : null;

  const selosResumo = (
    <span className="selos">
      <BadgeEditoria slug={slug} curto />
      {props.selo}
      {item.impacto && <Selo tom={TOM_IMPACTO[item.impacto] ?? 'neutro'}>impacto {item.impacto}</Selo>}
      {data && <Selo>{diaMes(data)}</Selo>}
      <IndicadorRelevancia relevancia={item.relevancia} />
    </span>
  );

  return (
    <article className="card-noticia com-editoria" style={estiloEditoria(slug)}>
      <button type="button" className="card-noticia-topo" aria-haspopup="dialog" onClick={() => setAberto(true)}>
        {item.emoji && (
          <span className="emoji" aria-hidden="true">
            {item.emoji}
          </span>
        )}
        <span className="card-noticia-corpo">
          <span className="card-noticia-titulo">{item.titulo}</span>
          <span className="card-noticia-oque">{textoVisivel(item)}</span>
          {selosResumo}
        </span>
        <span className="card-noticia-mais" aria-hidden="true">
          ›
        </span>
      </button>

      {aberto && (
        <Modal titulo={<TituloNoticia item={item} />} cabecalho={selosResumo} onFechar={() => setAberto(false)}>
          <DetalheNoticia item={item} anteriores={props.anteriores} />
        </Modal>
      )}
    </article>
  );
}
