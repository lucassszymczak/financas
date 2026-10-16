import { useEffect, useState, type ReactNode } from 'react';
import { useEstado } from './state';
import { ABAS, irPara, useAba, type AbaId } from './router';
import { BotaoCarregar } from './components/Carregar';
import { Ticker } from './components/Ticker';
import { useAbrirHistorico } from './components/HistoricoAtivo';
import { useTemaEfetivo } from './tema';
import { dataCurta, dataLonga } from './lib/formato';
import { BoasVindas } from './screens/BoasVindas';
import { Hoje } from './screens/Hoje';
import { EmBreve } from './screens/EmBreve';

const PRINCIPAIS: AbaId[] = ['hoje', 'mercado', 'agro', 'clima'];

function Tela({ aba }: { aba: AbaId }): ReactNode {
  switch (aba) {
    case 'hoje':
      return <Hoje />;
    default:
      return <EmBreve nome={ABAS.find((a) => a.id === aba)!.nome} />;
  }
}

export function App() {
  const { carregando, atual, modoLeitura, abrirEdicao, config } = useEstado();
  const aba = useAba();
  const abrirHistorico = useAbrirHistorico();
  const [tema, alternarTema] = useTemaEfetivo();
  const [mais, setMais] = useState(false);

  useEffect(() => setMais(false), [aba]);
  useEffect(() => {
    document.title = atual ? `${config.nomeApp} · ${dataCurta(atual.data)}` : config.nomeApp;
  }, [atual, config.nomeApp]);

  if (carregando) return <div className="carregando">Carregando…</div>;

  // Configurações ficam acessíveis mesmo sem dados (para restaurar backup).
  const semDados = !atual && aba !== 'config';

  return (
    <div className="app">
      <header className="topo">
        <a href="#/hoje" className="marca">
          <span className="marca-ponto" aria-hidden="true" />
          <span className="marca-nome">{config.nomeApp}</span>
        </a>
        {atual && (
          <span className="topo-edicao" title={atual.radar.edicao.titulo ?? undefined}>
            <span className="so-desktop">Edição de </span>
            {dataLonga(atual.data)}
          </span>
        )}
        <div className="topo-acoes">
          <button
            type="button"
            className="btn btn-icone"
            onClick={alternarTema}
            aria-label={tema === 'escuro' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            title="Alternar tema"
          >
            {tema === 'escuro' ? '☀️' : '🌙'}
          </button>
          <BotaoCarregar compacto className="btn btn-primario btn-carregar-topo" />
        </div>
      </header>

      {atual && <Ticker cotacoes={atual.radar.cotacoes} onAbrir={abrirHistorico} />}

      <nav className="lateral" aria-label="Seções">
        <ul>
          {ABAS.map((a) => (
            <li key={a.id}>
              <a href={`#/${a.id}`} aria-current={aba === a.id ? 'page' : undefined}>
                <span aria-hidden="true">{a.icone}</span> {a.nome}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <main className="conteudo" id="conteudo">
        {modoLeitura && atual && (
          <div className="faixa-leitura" role="status">
            <span>
              📖 Você está vendo a edição de <strong>{dataCurta(atual.data)}</strong> (modo leitura).
            </span>
            <button type="button" className="btn btn-pequeno" onClick={() => abrirEdicao(null)}>
              Voltar para a mais recente
            </button>
          </div>
        )}
        {semDados ? <BoasVindas nome={config.nomeApp} /> : <Tela aba={aba} />}
      </main>

      <nav className="inferior" aria-label="Seções">
        {PRINCIPAIS.map((id) => {
          const a = ABAS.find((x) => x.id === id)!;
          return (
            <a key={id} href={`#/${id}`} aria-current={aba === id ? 'page' : undefined}>
              <span aria-hidden="true">{a.icone}</span>
              <span>{a.nome}</span>
            </a>
          );
        })}
        <button
          type="button"
          aria-expanded={mais}
          aria-controls="menu-mais"
          className={!PRINCIPAIS.includes(aba) ? 'ativo' : undefined}
          onClick={() => setMais(!mais)}
        >
          <span aria-hidden="true">☰</span>
          <span>Mais</span>
        </button>
      </nav>
      {mais && (
        <div className="mais-fundo" onClick={() => setMais(false)}>
          <ul id="menu-mais" className="menu-mais" onClick={(e) => e.stopPropagation()}>
            {ABAS.filter((a) => !PRINCIPAIS.includes(a.id)).map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => irPara(a.id)} aria-current={aba === a.id ? 'page' : undefined}>
                  <span aria-hidden="true">{a.icone}</span> {a.nome}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
