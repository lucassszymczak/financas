import { useMemo, useState } from 'react';
import { useEstado, useRadar } from '../state';
import { hrefRota } from '../router';
import { contarPorEditoria, editoria, EDITORIAS, ehEditoria, type ModoOrdem } from '../dominio/editorias';
import { noticiasDoPeriodo } from '../lib/noticias';
import { somaDias } from '../lib/formato';
import { gravarLocal, lerLocal } from '../lib/local';
import { ListaNoticias } from '../components/NoticiasEditoria';

const PERIODOS = [
  { dias: 1, nome: 'Hoje' },
  { dias: 7, nome: 'Últimos 7 dias' },
  { dias: 30, nome: 'Últimos 30 dias' },
];

/**
 * Notícias por editoria (`/noticias` e `/noticias/:editoria`): chips de editoria sincronizados com a rota,
 * período (edição aberta, 7 ou 30 dias, sem repetir a mesma notícia) e ordenação.
 */
export function Noticias({ sub }: { sub: string | null }) {
  const { vista } = useRadar();
  const { dias } = useEstado();
  const slug = ehEditoria(sub) ? sub : null;
  const [periodo, setPeriodoEstado] = useState<number>(() => lerLocal('radar.noticias.periodo', 1));
  const [modo, setModoEstado] = useState<ModoOrdem>(() => lerLocal('radar.noticias.ordem', 'relevancia'));
  const setPeriodo = (p: number) => {
    gravarLocal('radar.noticias.periodo', p);
    setPeriodoEstado(p);
  };
  const setModo = (m: ModoOrdem) => {
    gravarLocal('radar.noticias.ordem', m);
    setModoEstado(m);
  };

  const itens = useMemo(() => {
    if (periodo <= 1) return noticiasDoPeriodo([{ data: vista.data, edicoes: vista.doDia.map((e) => e.radar) }]);
    const inicio = somaDias(vista.data, -(periodo - 1));
    return noticiasDoPeriodo(
      dias.filter((d) => d.data >= inicio && d.data <= vista.data).map((d) => ({ data: d.data, edicoes: d.edicoes.map((e) => e.radar) })),
    );
  }, [periodo, vista, dias]);

  const contagem = contarPorEditoria(itens);
  const atual = slug ? editoria(slug) : null;
  const total = slug ? contagem[slug] : itens.length;
  // "Sem destaques relevantes hoje" só vale para a edição aberta (período "Hoje") que traz a lista;
  // em períodos maiores, edições novas usam o texto genérico e as antigas, o de "não classificada".
  const listaDoDia = vista.radar.editorias_sem_destaque;
  const semDestaque = periodo <= 1 || !listaDoDia ? listaDoDia : [];

  return (
    <div className="tela tela-noticias">
      <div className="noticias-cab">
        <p className="mudo">{atual ? atual.descricao : 'Todas as editorias, na ordem do Radar.'}</p>
        <p className="noticias-conta num">
          {total} {total === 1 ? 'notícia' : 'notícias'}
        </p>
      </div>

      <nav className="chips chips-editoria" aria-label="Editorias">
        <a href={hrefRota('noticias')} className="chip-filtro" aria-current={!slug ? 'page' : undefined}>
          Todas <span className="num">{itens.length}</span>
        </a>
        {EDITORIAS.filter((e) => e.slug !== 'outras' || contagem.outras).map((e) => (
          <a
            key={e.slug}
            href={hrefRota('noticias', e.slug)}
            className={`chip-filtro${contagem[e.slug] ? '' : ' chip-vazio'}`}
            aria-current={slug === e.slug ? 'page' : undefined}
          >
            <span aria-hidden="true">{e.icone}</span> {e.curto} <span className="num">{contagem[e.slug] || '—'}</span>
          </a>
        ))}
      </nav>

      <div className="filtros">
        <div className="alternador" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.dias} type="button" aria-pressed={periodo === p.dias} onClick={() => setPeriodo(p.dias)}>
              {p.nome}
            </button>
          ))}
        </div>
        <div className="alternador" role="group" aria-label="Ordenar">
          <button type="button" aria-pressed={modo === 'relevancia'} onClick={() => setModo('relevancia')}>
            Mais relevantes
          </button>
          <button type="button" aria-pressed={modo === 'recentes'} onClick={() => setModo('recentes')}>
            Mais recentes
          </button>
        </div>
      </div>

      <ListaNoticias itens={itens} slug={slug} semDestaque={semDestaque} modo={modo} comData={periodo > 1} />
    </div>
  );
}
