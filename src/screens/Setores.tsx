import { useEffect, useRef, type CSSProperties } from 'react';
import { useRadar } from '../state';
import { hrefRota } from '../router';
import { opacidadeSetor, setoresDoRadar } from '../lib/categorias';
import { numero } from '../lib/formato';
import { Vazio } from '../components/Basicos';
import { TabelaAtivos } from '../components/TabelaAtivos';

const mediaTexto = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${numero(Math.abs(v), 2)}%`);

/** Mapa setorial: um cartão por setor B3 e, ao escolher um, a tabela das ações dele. */
export function Setores({ setor }: { setor: string | null }) {
  const { radar } = useRadar();
  const setores = setoresDoRadar(radar);
  const escolhido = setores.find((s) => s.setor === setor);
  const tabela = useRef<HTMLElement>(null);
  // No celular a tabela fica abaixo dos cartões: ao escolher um setor, rola até ela se estiver fora da vista.
  useEffect(() => {
    const t = tabela.current;
    if (setor && t && t.getBoundingClientRect().top > window.innerHeight * 0.6) t.scrollIntoView({ block: 'start' });
  }, [setor]);
  if (!setores.length)
    return (
      <Vazio>
        Esta edição não trouxe ações com setor. O mapa aparece quando o arquivo traz as ações do Ibovespa (bloco{' '}
        <code>cotacoes_amplas</code>) ou o campo <code>setor</code>.
      </Vazio>
    );
  return (
    <>
      <p className="nota-rodape">
        Variação média simples das ações de cada setor no arquivo do dia. A cor fica mais forte quanto maior a variação.
      </p>
      <div className="setores">
        {setores.map((s) => {
          const tom = s.media === null ? 'z' : s.media > 0 ? 'up' : s.media < 0 ? 'dn' : 'z';
          const estilo = {
            '--tinta': `var(${(s.media ?? 0) >= 0 ? '--alta' : '--baixa'})`,
            '--opacidade': opacidadeSetor(s.media),
          } as CSSProperties;
          const comDado = s.altas + s.baixas;
          return (
            <a
              key={s.setor}
              className="setor"
              style={estilo}
              href={hrefRota('mercado', 'setores', s.setor === setor ? null : s.setor)}
              aria-current={s.setor === setor ? 'true' : undefined}
            >
              <h3>{s.setor}</h3>
              <span className={`setor-media num ${tom}`}>{mediaTexto(s.media)}</span>
              <span className="setor-barra" aria-hidden="true">
                <i style={{ width: `${comDado ? (s.altas / comDado) * 100 : 0}%` }} />
              </span>
              <span className="setor-meta num">
                <span>
                  {s.itens.length} {s.itens.length === 1 ? 'ação' : 'ações'}
                </span>
                <span>
                  <span className="up">▲ {s.altas}</span> · <span className="dn">▼ {s.baixas}</span>
                </span>
              </span>
            </a>
          );
        })}
      </div>
      {escolhido ? (
        <section className="painel painel-setor" ref={tabela} aria-labelledby="setor-titulo">
          <div className="painel-cabeca">
            <h2 id="setor-titulo">{escolhido.setor}</h2>
            <a href={hrefRota('mercado', 'setores')} className="painel-mais">
              Ver todos os setores
            </a>
          </div>
          <TabelaAtivos itens={escolhido.itens} edicaoData={radar.edicao.data} />
        </section>
      ) : (
        <Vazio>Escolha um setor para ver as ações dele.</Vazio>
      )}
    </>
  );
}
