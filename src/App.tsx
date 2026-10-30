import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useEstado } from './state';
import { ABAS, irPara, useRota, type Rota } from './router';
import { BotaoCarregar } from './components/Carregar';
import { MenuSuperior } from './components/MenuSuperior';
import { Fita, LinhaTaxas } from './components/Fita';
import { useTemaEfetivo } from './tema';
import { dataCurta, diaMes } from './lib/formato';
import { categoria, opcoesFita } from './lib/categorias';
import { editoria, ehEditoria } from './dominio/editorias';
import { gravarLocal, lerLocal } from './lib/local';
import { nomeRegiao } from './lib/precos';
import type { Radar } from './schema/radar';
import { BoasVindas } from './screens/BoasVindas';
import { Hoje } from './screens/Hoje';
import { Noticias } from './screens/Noticias';
import { Mercado } from './screens/Mercado';
import { RendaFixa } from './screens/RendaFixa';
import { Agro } from './screens/Agro';
import { Historico } from './screens/Historico';
import { Clima } from './screens/Clima';
import { Agenda } from './screens/Agenda';
import { Calculadoras } from './screens/Calculadoras';
import { Config } from './screens/Config';

const PRINCIPAIS = ['hoje', 'mercado', 'agro', 'clima'] as const;

function Tela({ rota }: { rota: Rota }): ReactNode {
  switch (rota.aba) {
    case 'hoje':
      return <Hoje />;
    case 'noticias':
      return <Noticias sub={rota.sub} />;
    case 'mercado':
      return <Mercado sub={rota.sub} arg={rota.arg} />;
    case 'renda-fixa':
      return <RendaFixa sub={rota.sub} />;
    case 'agro':
      return <Agro praca={rota.sub} />;
    case 'clima':
      return <Clima />;
    case 'agenda':
      return <Agenda />;
    case 'calculadoras':
      return <Calculadoras />;
    case 'historico':
      return <Historico />;
    case 'config':
      return <Config parear={rota.sub === 'parear' ? rota.arg : null} />;
  }
}

/** Caminho e título da tela atual, para o cabeçalho de cada página. */
export function tituloRota(r: Rota, radar: Radar | null): { caminho: string; titulo: string } {
  const nome = ABAS.find((a) => a.id === r.aba)!.nome;
  const cat = categoria(r.sub);
  switch (r.aba) {
    case 'hoje':
      return { caminho: 'Hoje', titulo: radar ? `Radar de ${diaMes(radar.edicao.data)}` : 'Hoje' };
    case 'noticias':
      return {
        caminho: 'Notícias',
        titulo: ehEditoria(r.sub) ? `${editoria(r.sub).icone} ${editoria(r.sub).rotulo}` : 'Todas as notícias',
      };
    case 'mercado':
      if (r.sub === 'setores') return { caminho: 'Mercado › Setores', titulo: r.arg ?? 'Mapa setorial' };
      return { caminho: 'Mercado', titulo: cat?.nome ?? 'Visão geral' };
    case 'renda-fixa':
      return { caminho: 'Renda fixa', titulo: cat?.nome ?? 'Taxas de referência' };
    case 'agro':
      return {
        caminho: 'Agro',
        titulo: r.sub ? (r.sub === 'brasil' ? 'Físico Brasil (Cepea)' : nomeRegiao(r.sub)) : 'Todas as praças',
      };
    default:
      return { caminho: 'Radar', titulo: nome };
  }
}

export function App() {
  const { carregando, atual, modoLeitura, abrirEdicao, config } = useEstado();
  const rota = useRota();
  const aba = rota.aba;
  const [tema, alternarTema] = useTemaEfetivo();
  const [mais, setMais] = useState(false);
  const [filtroSalvo, setFiltroSalvo] = useState(() => lerLocal('radar.fita.filtro', 'principais'));
  const setFiltro = (f: string) => {
    gravarLocal('radar.fita.filtro', f);
    setFiltroSalvo(f);
  };
  // Um setor escolhido antes pode não existir na edição aberta: volta para "Principais".
  const filtro = useMemo(
    () => (atual && opcoesFita(atual.radar).some((o) => o.valor === filtroSalvo) ? filtroSalvo : 'principais'),
    [atual, filtroSalvo],
  );

  useEffect(() => setMais(false), [rota]);
  useEffect(() => {
    document.title = atual ? `${config.nomeApp} · ${dataCurta(atual.data)}` : config.nomeApp;
  }, [atual, config.nomeApp]);

  if (carregando) return <div className="carregando">Carregando…</div>;

  // Configurações ficam acessíveis mesmo sem dados (para restaurar backup).
  const semDados = !atual && aba !== 'config';
  const cab = tituloRota(rota, atual?.radar ?? null);

  return (
    <div className="app">
      <header className="topo">
        <MenuSuperior rota={rota} radar={atual?.radar ?? null} nomeApp={config.nomeApp} tema={tema} alternarTema={alternarTema} />
        {atual && <LinhaTaxas radar={atual.radar} filtro={filtro} setFiltro={setFiltro} />}
        {atual && <Fita radar={atual.radar} filtro={filtro} />}
      </header>

      <main className="conteudo" id="conteudo">
        {modoLeitura && atual && (
          <div className="faixa-leitura" role="status">
            <span>
              Você está vendo a edição de <strong>{dataCurta(atual.data)}</strong> (modo leitura).
            </span>
            <button type="button" className="btn btn-pequeno" onClick={() => abrirEdicao(null)}>
              Voltar para a mais recente
            </button>
          </div>
        )}
        {!semDados && (
          <div className="migalha">
            <div>
              <div className="migalha-caminho">{cab.caminho}</div>
              <h1>{cab.titulo}</h1>
            </div>
            {atual && (
              <div className="migalha-ref" title={atual.radar.edicao.titulo ?? undefined}>
                Edição de <b className="num">{dataCurta(atual.data)}</b>
              </div>
            )}
          </div>
        )}
        {semDados ? <BoasVindas nome={config.nomeApp} /> : <Tela rota={rota} />}
      </main>

      <nav className="inferior" aria-label="Seções">
        {PRINCIPAIS.map((id) => {
          const a = ABAS.find((x) => x.id === id)!;
          return (
            <a key={id} href={`#/${id}`} aria-current={aba === id ? 'page' : undefined}>
              {a.nome}
            </a>
          );
        })}
        <button
          type="button"
          aria-expanded={mais}
          aria-controls="menu-mais"
          className={!(PRINCIPAIS as readonly string[]).includes(aba) ? 'ativo' : undefined}
          onClick={() => setMais(!mais)}
        >
          Mais
        </button>
      </nav>
      {mais && (
        <div className="mais-fundo" onClick={() => setMais(false)}>
          <ul id="menu-mais" className="menu-mais" onClick={(e) => e.stopPropagation()}>
            {ABAS.filter((a) => !(PRINCIPAIS as readonly string[]).includes(a.id)).map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => irPara(a.id)} aria-current={aba === a.id ? 'page' : undefined}>
                  {a.nome}
                </button>
              </li>
            ))}
            <li>
              <BotaoCarregar className="menu-mais-carregar" />
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
