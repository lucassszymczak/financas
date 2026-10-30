import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useRadar } from '../state';
import { hrefRota } from '../router';
import { itensCategoria, opacidadeSetor, setoresDoRadar, tiposFiiDoRadar, type ResumoSetor } from '../lib/categorias';
import { numero } from '../lib/formato';
import { Vazio } from '../components/Basicos';
import { TabelaAtivos } from '../components/TabelaAtivos';

const mediaTexto = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${numero(Math.abs(v), 2)}%`);

/**
 * Cartões por grupo (setor B3, tipo de FII…) com a variação média simples e, ao escolher um,
 * a tabela dos ativos dele. Sem escolha, mostra `semEscolha`.
 */
function MapaCartoes({
  grupos,
  escolhido,
  href,
  unidade,
  nota,
  rotuloTodos,
  semEscolha,
}: {
  grupos: ResumoSetor[];
  escolhido: string | null;
  href: (nome: string | null) => string;
  unidade: [string, string];
  nota: string;
  rotuloTodos: string;
  semEscolha: ReactNode;
}) {
  const { radar } = useRadar();
  const atual = grupos.find((s) => s.setor === escolhido);
  const tabela = useRef<HTMLElement>(null);
  // No celular a tabela fica abaixo dos cartões: ao escolher um grupo, rola até ela se estiver fora da vista.
  useEffect(() => {
    const t = tabela.current;
    if (escolhido && t && t.getBoundingClientRect().top > window.innerHeight * 0.6) t.scrollIntoView({ block: 'start' });
  }, [escolhido]);
  return (
    <>
      <p className="nota-rodape">{nota}</p>
      <div className="setores">
        {grupos.map((s) => {
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
              href={href(s.setor === escolhido ? null : s.setor)}
              aria-current={s.setor === escolhido ? 'true' : undefined}
            >
              <h3>{s.setor}</h3>
              <span className={`setor-media num ${tom}`}>{mediaTexto(s.media)}</span>
              <span className="setor-barra" aria-hidden="true">
                <i style={{ width: `${comDado ? (s.altas / comDado) * 100 : 0}%` }} />
              </span>
              <span className="setor-meta num">
                <span>
                  {s.itens.length} {s.itens.length === 1 ? unidade[0] : unidade[1]}
                </span>
                <span>
                  <span className="up">▲ {s.altas}</span> · <span className="dn">▼ {s.baixas}</span>
                </span>
              </span>
            </a>
          );
        })}
      </div>
      {atual ? (
        <section className="painel painel-setor" ref={tabela} aria-labelledby="setor-titulo">
          <div className="painel-cabeca">
            <h2 id="setor-titulo">{atual.setor}</h2>
            <a href={href(null)} className="painel-mais">
              {rotuloTodos}
            </a>
          </div>
          <TabelaAtivos itens={atual.itens} edicaoData={radar.edicao.data} />
        </section>
      ) : (
        semEscolha
      )}
    </>
  );
}

/** Mapa setorial: um cartão por setor B3 e, ao escolher um, a tabela das ações dele. */
export function Setores({ setor }: { setor: string | null }) {
  const { radar } = useRadar();
  const setores = setoresDoRadar(radar);
  if (!setores.length)
    return (
      <Vazio>
        Esta edição não trouxe ações com setor. O mapa aparece quando o arquivo traz as ações do Ibovespa (bloco{' '}
        <code>cotacoes_amplas</code>) ou o campo <code>setor</code>.
      </Vazio>
    );
  return (
    <MapaCartoes
      grupos={setores}
      escolhido={setor}
      href={(s) => hrefRota('mercado', 'setores', s)}
      unidade={['ação', 'ações']}
      nota="Variação média simples das ações de cada setor no arquivo do dia. A cor fica mais forte quanto maior a variação."
      rotuloTodos="Ver todos os setores"
      semEscolha={<Vazio>Escolha um setor para ver as ações dele.</Vazio>}
    />
  );
}

/** FIIs por tipo (Logística, Lajes, Shoppings, Recebíveis…): cartões por tipo e, sem escolha, todos os fundos. */
export function FiisPorTipo({ tipo }: { tipo: string | null }) {
  const { radar } = useRadar();
  const tipos = tiposFiiDoRadar(radar);
  const todos = itensCategoria(radar, 'fiis');
  if (!todos.length) return <Vazio>Esta edição não trouxe fundos imobiliários.</Vazio>;
  return (
    <MapaCartoes
      grupos={tipos}
      escolhido={tipo}
      href={(t) => hrefRota('mercado', 'fiis', t)}
      unidade={['fundo', 'fundos']}
      nota="Variação média simples dos fundos de cada tipo no arquivo do dia. Escolha um tipo para ver só os fundos dele."
      rotuloTodos="Ver todos os FIIs"
      semEscolha={
        <section className="painel painel-setor" aria-labelledby="fiis-titulo">
          <div className="painel-cabeca">
            <h2 id="fiis-titulo">Todos os FIIs ({todos.length})</h2>
          </div>
          <TabelaAtivos itens={todos} comTipoFii edicaoData={radar.edicao.data} />
        </section>
      }
    />
  );
}
