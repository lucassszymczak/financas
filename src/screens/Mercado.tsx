import { useMemo, useState } from 'react';
import { useRadar } from '../state';
import { Leitura, Vazio } from '../components/Basicos';
import { ControlesVisao, GrupoAtivos, useVisaoOrdem } from '../components/GrupoAtivos';
import { agrupar, cotacoesAmplas, mapaPrecos, nomeGrupo, taxasComoPrecos, todosPrecos } from '../lib/precos';
import { buscarAtivos } from '../lib/busca';
import { montarWatchlist } from '../lib/watchlist';
import { gravarLocal, lerLocal } from '../lib/local';
import { categoria } from '../lib/categorias';
import { Abas, ABAS_MERCADO } from '../components/Abas';
import { Setores } from './Setores';
import { Categoria } from './Categoria';

/** Mercado: abas Visão geral (minha lista / todos os grupos), Setores e uma lista por categoria. */
export function Mercado({ sub = null, arg = null }: { sub?: string | null; arg?: string | null }) {
  const cat = categoria(sub);
  const atual = sub === 'setores' ? 'setores' : cat?.area === 'mercado' ? sub : null;
  return (
    <div className="tela">
      <Abas aba="mercado" itens={ABAS_MERCADO} atual={atual} />
      {sub === 'setores' ? <Setores setor={arg} /> : cat ? <Categoria key={cat.id} id={cat.id} /> : <VisaoGeral />}
    </div>
  );
}

function VisaoGeral() {
  const { radar, config, edicoes } = useRadar();
  const [fonte, setFonteEstado] = useState<'lista' | 'grupos'>(() => lerLocal('radar.mercado.fonte', 'lista'));
  const setFonte = (f: 'lista' | 'grupos') => {
    gravarLocal('radar.mercado.fonte', f);
    setFonteEstado(f);
  };
  const { visao, setVisao, ordem, setOrdem } = useVisaoOrdem('mercado');
  const radares = useMemo(() => edicoes.map((e) => e.radar), [edicoes]);
  const grupos = useMemo(
    () => agrupar([...radar.cotacoes, ...taxasComoPrecos(radar), ...cotacoesAmplas(radar)], (c) => c.grupo ?? 'outros'),
    [radar],
  );
  const [busca, setBusca] = useState('');
  const resultados = useMemo(() => (busca.trim() ? buscarAtivos(todosPrecos(radar), busca) : []), [busca, radar]);
  const total = todosPrecos(radar).length;
  const watch = useMemo(() => montarWatchlist(config.watchlist, mapaPrecos(radar)), [config.watchlist, radar]);
  const data = radar.edicao.data;
  // Ações que vieram só com a variação: o preço precisa vir no campo "valor" do arquivo.
  const acoesSemPreco = radar.cotacoes.filter((c) => c.grupo.startsWith('acoes') && (c.valor === null || c.valor === undefined));

  const comum = { edicaoData: data, visao, ordem, radares };

  return (
    <>
      <Leitura titulo="Leitura do mercado" texto={radar.leituras_secao?.mercado} destaque />
      {acoesSemPreco.length > 0 && (
        <details className="aviso-preco">
          <summary>
            {acoesSemPreco.length} {acoesSemPreco.length === 1 ? 'ação sem preço' : 'ações sem preço'} no arquivo de hoje (só
            variação)
          </summary>
          <p>
            {acoesSemPreco.map((c) => c.id).join(', ')}. O preço aparece quando a rotina preencher o campo <code>valor</code>.
          </p>
        </details>
      )}
      <div className="busca">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Buscar entre ${total} ativos (ex.: WEGE3, Nasdaq, ouro)`}
          aria-label="Buscar ativo"
          enterKeyHint="search"
        />
      </div>
      {busca.trim() !== '' && (
        <div className="grupos">
          {resultados.length ? (
            <GrupoAtivos
              key={`busca:${busca}`}
              chave="busca"
              titulo={`Resultados (${resultados.length})`}
              itens={resultados}
              sempreAberto
              {...comum}
            />
          ) : (
            <Vazio>Nenhum ativo encontrado para “{busca}” nesta edição.</Vazio>
          )}
        </div>
      )}
      {busca.trim() === '' && (
        <>
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
                  <GrupoAtivos
                    key={g.nome}
                    chave={`w:${g.nome}`}
                    titulo={g.nome}
                    itens={g.itens}
                    ausentes={g.ausentes}
                    {...comum}
                  />
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
        </>
      )}
    </>
  );
}
