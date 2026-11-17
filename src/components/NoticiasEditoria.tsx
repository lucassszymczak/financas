import { useState } from 'react';
import {
  agruparPorEditoria,
  editoria,
  editoriaDe,
  ordenarNoticias,
  type EditoriaSlug,
  type ModoOrdem,
} from '../dominio/editorias';
import type { NoticiaListada } from '../lib/noticias';
import { horaBR } from '../lib/edicoes';
import { diaMes } from '../lib/formato';
import { gravarLocal, lerLocal } from '../lib/local';
import { hrefRota } from '../router';
import { Selo } from './Basicos';
import { BadgeEditoria, DetalheNoticia, estiloEditoria, IndicadorRelevancia, textoVisivel, TituloNoticia } from './CardNoticia';
import { Modal } from './Modal';

/** Selo da fusão do dia ("Nova · 12h05", "Atualizada às 12h20"). */
export function SeloFusao({ n }: { n: NoticiaListada }) {
  if (n.status === 'nova') return <span className="selo selo-destaque">Nova · {horaBR(n.horaSelo)}</span>;
  if (n.status === 'atualizada') return <span className="selo selo-info">Atualizada às {horaBR(n.horaSelo)}</span>;
  return null;
}

/** Texto do estado vazio de uma editoria. */
export function textoVazio(slug: EditoriaSlug, semDestaque: readonly string[] | null | undefined): string {
  if (semDestaque?.includes(slug)) return 'Sem destaques relevantes hoje neste assunto.';
  if (!semDestaque) return 'Nenhuma notícia classificada neste assunto nesta edição.';
  return 'Nenhuma notícia neste assunto no período.';
}

/** Card completo da página Notícias: tudo visível, sem precisar abrir. */
export function CardNoticiaCompleto({ n, comData = false }: { n: NoticiaListada; comData?: boolean }) {
  const slug = editoriaDe(n.item);
  return (
    <article className="card-completo com-editoria" style={estiloEditoria(slug)}>
      <div className="card-completo-topo">
        <BadgeEditoria slug={slug} curto />
        <span className="mudo pequeno num">
          {comData && `${diaMes(n.data)} · `}
          {horaBR(n.hora)}
        </span>
        {n.tipo === 'destaque' && <Selo tom="destaque">Destaque</Selo>}
        <SeloFusao n={n} />
        <IndicadorRelevancia relevancia={n.item.relevancia} />
      </div>
      <h3 className="card-completo-titulo">
        <TituloNoticia item={n.item} />
      </h3>
      <p className="card-completo-resumo">{textoVisivel(n.item)}</p>
      <DetalheNoticia item={n.item} anteriores={n.anteriores} semVisivel />
    </article>
  );
}

/** Linha compacta (título, uma linha de resumo, hora e fonte); abre o detalhe num pop-up. */
function ItemCompacto({ n }: { n: NoticiaListada }) {
  const [aberto, setAberto] = useState(false);
  const fonte = n.item.fontes[0]?.nome;
  return (
    <li>
      <button type="button" className="item-compacto" aria-haspopup="dialog" onClick={() => setAberto(true)}>
        <span className="item-compacto-titulo">{n.item.titulo}</span>
        <span className="item-compacto-resumo">{textoVisivel(n.item)}</span>
        <span className="item-compacto-meta mudo pequeno">
          {horaBR(n.hora)}
          {fonte && ` · ${fonte}`}
          <SeloFusao n={n} />
        </span>
      </button>
      {aberto && (
        <Modal
          titulo={<TituloNoticia item={n.item} />}
          cabecalho={
            <span className="selos">
              <BadgeEditoria slug={editoriaDe(n.item)} curto />
              <IndicadorRelevancia relevancia={n.item.relevancia} />
            </span>
          }
          onFechar={() => setAberto(false)}
        >
          <DetalheNoticia item={n.item} anteriores={n.anteriores} />
        </Modal>
      )}
    </li>
  );
}

const CHAVE_ABERTAS = 'radar.editorias.abertas';
const MAX_NO_BLOCO = 2;

/**
 * "Radar por assunto" da tela Hoje: um bloco por assunto, na ordem fixa, com até 2 notícias (as mais
 * relevantes, sem repetir os destaques) e o link "Ver todas". Editoria vazia vira uma linha cinza.
 * Blocos recolhíveis; o estado de cada um fica lembrado neste aparelho.
 */
export function RadarPorEditoria({
  itens,
  semDestaque,
  largo = typeof window === 'undefined' || window.innerWidth > 1020,
}: {
  itens: NoticiaListada[];
  /** `editorias_sem_destaque` da edição; `null`/`undefined` em edições antigas. */
  semDestaque: readonly string[] | null | undefined;
  /** Tela larga: blocos abertos por padrão. No celular, só os 3 primeiros com conteúdo. */
  largo?: boolean;
}) {
  const grupos = agruparPorEditoria(itens, semDestaque ?? []);
  const [salvos, setSalvos] = useState<Record<string, boolean>>(() => lerLocal(CHAVE_ABERTAS, {}));
  const comConteudo = grupos.filter((g) => g.itens.some((x) => x.tipo !== 'destaque')).map((g) => g.editoria.slug);
  const alternar = (slug: string, aberto: boolean) => {
    const novo = { ...salvos, [slug]: !aberto };
    setSalvos(novo);
    gravarLocal(CHAVE_ABERTAS, novo);
  };
  return (
    <section className="secao radar-editorias" aria-labelledby="titulo-radar-editorias">
      <div className="secao-topo">
        <h2 id="titulo-radar-editorias">Radar por assunto</h2>
        <a className="painel-mais" href={hrefRota('noticias')}>
          Todas as notícias →
        </a>
      </div>
      <div className="blocos-editoria">
        {grupos.map(({ editoria: e, itens: doGrupo }) => {
          const lista = ordenarNoticias(doGrupo.filter((x) => x.tipo !== 'destaque')).slice(0, MAX_NO_BLOCO);
          if (!lista.length) {
            // Edições novas trazem a lista de editorias sem destaque; nas antigas, a notícia só não foi classificada.
            const motivo = semDestaque ? 'sem destaques relevantes hoje' : 'nenhuma notícia classificada nesta edição';
            return (
              <p key={e.slug} className="bloco-editoria-vazio" style={estiloEditoria(e.slug)}>
                <span aria-hidden="true">{e.icone}</span> {e.rotulo} · {doGrupo.length ? 'só no destaque acima' : motivo}
              </p>
            );
          }
          const aberto = salvos[e.slug] ?? (largo || comConteudo.indexOf(e.slug) < 3);
          return (
            <div key={e.slug} className="bloco-editoria com-editoria" style={estiloEditoria(e.slug)}>
              <button
                type="button"
                className="bloco-editoria-cab"
                aria-expanded={aberto}
                aria-controls={`bloco-${e.slug}`}
                onClick={() => alternar(e.slug, aberto)}
              >
                <span aria-hidden="true">{e.icone}</span>
                <span className="bloco-editoria-nome">{e.rotulo}</span>
                <span className="bloco-editoria-conta num">{doGrupo.length}</span>
                <span className="bloco-editoria-seta" aria-hidden="true">
                  ▾
                </span>
              </button>
              <div id={`bloco-${e.slug}`} hidden={!aberto}>
                <ul className="itens-compactos">
                  {lista.map((n) => (
                    <ItemCompacto key={n.chave} n={n} />
                  ))}
                </ul>
                <a className="bloco-editoria-todas" href={hrefRota('noticias', e.slug)}>
                  Ver todas ({doGrupo.length}) →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Lista da página Notícias. Com editoria: os cards dela, ordenados; sem editoria ("Todas"): agrupados
 * por editoria na ordem fixa, com subtítulo por grupo.
 */
export function ListaNoticias({
  itens,
  slug,
  semDestaque,
  modo,
  comData,
}: {
  itens: NoticiaListada[];
  slug: EditoriaSlug | null;
  semDestaque: readonly string[] | null | undefined;
  modo: ModoOrdem;
  comData: boolean;
}) {
  if (slug) {
    const doSlug = ordenarNoticias(
      itens.filter((n) => editoriaDe(n.item) === slug),
      modo,
    );
    if (!doSlug.length) return <p className="vazio">{textoVazio(slug, semDestaque)}</p>;
    return (
      <div className="lista-completa">
        {doSlug.map((n) => (
          <CardNoticiaCompleto key={n.chave} n={n} comData={comData} />
        ))}
      </div>
    );
  }
  const grupos = agruparPorEditoria(itens, semDestaque ?? []);
  const vazias = grupos.filter((g) => !g.itens.length).map((g) => g.editoria);
  if (!itens.length) return <p className="vazio">Nenhuma notícia nesta edição.</p>;
  return (
    <>
      {grupos
        .filter((g) => g.itens.length)
        .map((g) => (
          <section key={g.editoria.slug} className="grupo-editoria" aria-labelledby={`grupo-${g.editoria.slug}`}>
            <h2 id={`grupo-${g.editoria.slug}`} className="grupo-editoria-titulo" style={estiloEditoria(g.editoria.slug)}>
              <a href={hrefRota('noticias', g.editoria.slug)}>
                <span aria-hidden="true">{g.editoria.icone}</span> {g.editoria.rotulo}
              </a>
              <span className="mudo pequeno num">{g.itens.length}</span>
            </h2>
            <div className="lista-completa">
              {ordenarNoticias(g.itens, modo).map((n) => (
                <CardNoticiaCompleto key={n.chave} n={n} comData={comData} />
              ))}
            </div>
          </section>
        ))}
      {vazias.length > 0 && (
        <p className="mudo pequeno">
          Sem destaques relevantes: {vazias.map((e) => `${e.icone} ${editoria(e.slug).rotulo}`).join(' · ')}.
        </p>
      )}
    </>
  );
}
