import { useMemo, useState } from 'react';
import { useRadar } from '../state';
import { Leitura, Vazio } from '../components/Basicos';
import { ControlesVisao, GrupoAtivos, useVisaoOrdem } from '../components/GrupoAtivos';
import { agrupar, mapaPrecos, nomeGrupo, taxasComoPrecos } from '../lib/precos';
import { montarWatchlist } from '../lib/watchlist';
import { gravarLocal, lerLocal } from '../lib/local';

export function Mercado() {
  const { radar, config, edicoes } = useRadar();
  const [fonte, setFonteEstado] = useState<'lista' | 'grupos'>(() => lerLocal('radar.mercado.fonte', 'lista'));
  const setFonte = (f: 'lista' | 'grupos') => {
    gravarLocal('radar.mercado.fonte', f);
    setFonteEstado(f);
  };
  const { visao, setVisao, ordem, setOrdem } = useVisaoOrdem('mercado');
  const radares = useMemo(() => edicoes.map((e) => e.radar), [edicoes]);
  const grupos = useMemo(() => agrupar([...radar.cotacoes, ...taxasComoPrecos(radar)], (c) => c.grupo ?? 'outros'), [radar]);
  const watch = useMemo(() => montarWatchlist(config.watchlist, mapaPrecos(radar)), [config.watchlist, radar]);
  const data = radar.edicao.data;
  // Ações que vieram só com a variação: o preço precisa vir no campo "valor" do arquivo.
  const acoesSemPreco = radar.cotacoes.filter((c) => c.grupo.startsWith('acoes') && (c.valor === null || c.valor === undefined));

  const comum = { edicaoData: data, visao, ordem, radares };

  return (
    <div className="tela">
      <Leitura texto={radar.leituras_secao?.mercado} />
      {acoesSemPreco.length > 0 && (
        <details className="aviso-preco">
          <summary>
            ⚠️ {acoesSemPreco.length} {acoesSemPreco.length === 1 ? 'ação sem preço' : 'ações sem preço'} no arquivo de hoje (só
            variação)
          </summary>
          <p>
            {acoesSemPreco.map((c) => c.id).join(', ')}. O preço aparece quando a rotina preencher o campo <code>valor</code>.
          </p>
        </details>
      )}
      <ControlesVisao
        visao={visao}
        setVisao={setVisao}
        ordem={ordem}
        setOrdem={setOrdem}
        extra={
          <div className="alternador" role="group" aria-label="O que mostrar">
            <button type="button" aria-pressed={fonte === 'lista'} onClick={() => setFonte('lista')}>
              ⭐ Minha lista
            </button>
            <button type="button" aria-pressed={fonte === 'grupos'} onClick={() => setFonte('grupos')}>
              Todos
            </button>
          </div>
        }
      />

      {fonte === 'lista' &&
        (watch.length ? (
          <div className="grupos">
            {watch.map((g) => (
              <GrupoAtivos key={g.nome} chave={`w:${g.nome}`} titulo={g.nome} itens={g.itens} ausentes={g.ausentes} {...comum} />
            ))}
          </div>
        ) : (
          <Vazio>Sua lista está vazia. Marque ativos em Configurações → O que acompanhar.</Vazio>
        ))}

      {fonte === 'grupos' &&
        (grupos.length ? (
          <div className="grupos">
            {grupos.map(([g, itens]) => (
              <GrupoAtivos key={g} chave={`g:${g}`} titulo={nomeGrupo(g)} itens={itens} {...comum} />
            ))}
          </div>
        ) : (
          <Vazio>Esta edição não trouxe cotações.</Vazio>
        ))}
    </div>
  );
}
