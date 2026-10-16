import { useMemo, useState } from 'react';
import { useRadar } from '../state';
import { Leitura, Secao, Vazio } from '../components/Basicos';
import { TabelaPrecos } from '../components/TabelaPrecos';
import { agrupar, mapaPrecos, nomeGrupo, taxasComoPrecos } from '../lib/precos';
import { montarWatchlist } from '../lib/watchlist';

export function Mercado() {
  const { radar, config } = useRadar();
  const [visao, setVisao] = useState<'lista' | 'grupos'>('lista');
  const grupos = useMemo(() => agrupar([...radar.cotacoes, ...taxasComoPrecos(radar)], (c) => c.grupo ?? 'outros'), [radar]);
  const watch = useMemo(() => montarWatchlist(config.watchlist, mapaPrecos(radar)), [config.watchlist, radar]);
  const data = radar.edicao.data;

  return (
    <div className="tela">
      <Leitura texto={radar.leituras_secao?.mercado} />
      <div className="alternador" role="group" aria-label="Visão">
        <button type="button" aria-pressed={visao === 'lista'} onClick={() => setVisao('lista')}>
          ⭐ Minha lista
        </button>
        <button type="button" aria-pressed={visao === 'grupos'} onClick={() => setVisao('grupos')}>
          Todos os grupos
        </button>
      </div>

      {visao === 'lista' &&
        (watch.length ? (
          watch.map((g) => (
            <Secao key={g.nome} titulo={g.nome} id={`w-${g.nome}`}>
              <TabelaPrecos itens={g.itens} ausentes={g.ausentes} edicaoData={data} rotulo={g.nome} />
            </Secao>
          ))
        ) : (
          <Vazio>Sua lista está vazia. Marque ativos em Configurações → O que acompanhar.</Vazio>
        ))}

      {visao === 'grupos' &&
        (grupos.length ? (
          grupos.map(([g, itens]) => (
            <Secao key={g} titulo={nomeGrupo(g)} id={`g-${g}`}>
              <TabelaPrecos itens={itens} edicaoData={data} rotulo={nomeGrupo(g)} />
            </Secao>
          ))
        ) : (
          <Vazio>Esta edição não trouxe cotações.</Vazio>
        ))}
      <p className="mudo pequeno">Toque no nome de um ativo para ver o histórico. Toque no título da coluna para ordenar.</p>
    </div>
  );
}
