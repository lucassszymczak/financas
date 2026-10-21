import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Radar } from '../schema/radar';
import { hrefRota, ir, type Rota } from '../router';
import { CATEGORIAS, buscarSetores, itensCategoria, setoresDoRadar, tiposFiiDoRadar } from '../lib/categorias';
import { buscarAtivos } from '../lib/busca';
import { numero } from '../lib/formato';
import { nomeRegiao, todosPrecos } from '../lib/precos';
import { useAbrirHistorico } from './HistoricoAtivo';
import { BotaoCarregar } from './Carregar';
import { Variacao } from './Basicos';
import { AtivoIcone } from './AtivoIcone';

type Folha = { nome: string; href: string; direita?: ReactNode };
type Grupo = { titulo: string; itens: Folha[] };
type ItemMenu = { id: string; nome: string; href?: string; largo?: boolean; grupos?: Grupo[]; extra?: ReactNode };

const NOME_PRACA: Record<string, string> = { brasil: 'Físico Brasil (Cepea)' };
const PRACAS = ['chicago', 'brasil', 'guarapuava', 'noroeste_paulista'];

/** Item do topo que fica sublinhado em laranja para a rota atual. */
export function itemAtivo(r: Rota): string {
  if (r.aba === 'mercado') return r.sub === 'setores' || (r.sub === 'fiis' && r.arg) ? 'setores' : 'mercado';
  if (r.aba === 'historico' || r.aba === 'config') return 'mais';
  return r.aba;
}

function mediaTexto(v: number | null) {
  if (v === null) return <span className="dd-v z">—</span>;
  return (
    <span className={`dd-v ${v > 0 ? 'up' : v < 0 ? 'dn' : 'z'}`}>
      {v > 0 ? '+' : v < 0 ? '−' : ''}
      {numero(Math.abs(v), 2)}%
    </span>
  );
}

function montarMenu(radar: Radar | null): ItemMenu[] {
  const conta = (id: string) => (radar ? <span className="dd-c">{itensCategoria(radar, id).length}</span> : undefined);
  const cat = (id: string, nome?: string): Folha => {
    const c = CATEGORIAS.find((x) => x.id === id)!;
    return { nome: nome ?? c.nome, href: hrefRota(c.area, id), direita: conta(id) };
  };
  const setores = radar ? setoresDoRadar(radar) : [];
  const tiposFii = radar ? tiposFiiDoRadar(radar) : [];
  const regioes = radar ? [...new Set(radar.agro.map((a) => a.regiao))] : PRACAS;
  regioes.sort((a, b) => (PRACAS.indexOf(a) + 1 || 99) - (PRACAS.indexOf(b) + 1 || 99));
  return [
    { id: 'hoje', nome: 'Hoje', href: hrefRota('hoje') },
    {
      id: 'mercado',
      nome: 'Mercado',
      largo: true,
      grupos: [
        {
          titulo: 'Panorama',
          itens: [{ nome: 'Visão geral', href: hrefRota('mercado') }, cat('acoes'), cat('indices_br'), cat('indices_mundo')],
        },
        { titulo: 'Outros ativos', itens: [cat('moedas'), cat('commodities'), cat('fiis', 'FIIs'), cat('cripto')] },
      ],
    },
    {
      id: 'setores',
      nome: 'Setores',
      largo: setores.length + tiposFii.length > 4,
      grupos: [
        {
          titulo: 'Ações por setor B3',
          itens: [
            { nome: 'Mapa setorial', href: hrefRota('mercado', 'setores') },
            ...setores.map((s) => ({
              nome: s.setor,
              href: hrefRota('mercado', 'setores', s.setor),
              direita: mediaTexto(s.media),
            })),
          ],
        },
        ...(tiposFii.length
          ? [
              {
                titulo: 'Fundos imobiliários por tipo',
                itens: [
                  { nome: 'Todos os FIIs', href: hrefRota('mercado', 'fiis') },
                  ...tiposFii.map((t) => ({
                    nome: t.setor,
                    href: hrefRota('mercado', 'fiis', t.setor),
                    direita: mediaTexto(t.media),
                  })),
                ],
              },
            ]
          : []),
      ],
    },
    {
      id: 'renda-fixa',
      nome: 'Renda fixa',
      grupos: [
        {
          titulo: 'Juros e títulos',
          itens: [cat('di'), cat('tesouro'), cat('juros_mundo'), { nome: 'Taxas de referência', href: hrefRota('renda-fixa') }],
        },
      ],
    },
    {
      id: 'agro',
      nome: 'Agro',
      grupos: [
        {
          titulo: 'Praças',
          itens: [
            { nome: 'Todas as praças', href: hrefRota('agro') },
            ...regioes.map((g) => ({ nome: NOME_PRACA[g] ?? nomeRegiao(g), href: hrefRota('agro', g) })),
          ],
        },
      ],
    },
    { id: 'clima', nome: 'Clima', href: hrefRota('clima') },
    { id: 'agenda', nome: 'Agenda', href: hrefRota('agenda') },
    { id: 'calculadoras', nome: 'Calculadoras', href: hrefRota('calculadoras') },
    {
      id: 'mais',
      nome: 'Mais',
      grupos: [
        {
          titulo: 'App',
          itens: [
            { nome: 'Histórico', href: hrefRota('historico') },
            { nome: 'Configurações', href: hrefRota('config') },
          ],
        },
      ],
      extra: <BotaoCarregar className="dd-carregar" />,
    },
  ];
}

const Seta = () => (
  <svg className="seta" viewBox="0 0 8 8" aria-hidden="true">
    <path d="M1 2.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

/**
 * Símbolo da Oracle Capital, versão negativa (para a faixa navy): anel branco atravessado
 * pela régua dourada. Geometria e cores exatas do arquivo do manual da marca; nunca mudar.
 */
export function SimboloOracle({ tamanho = 32 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="36" fill="none" stroke="#FFFFFF" strokeWidth="8" />
      <rect x="10" y="67" width="100" height="8" fill="#A67C2E" />
    </svg>
  );
}

/** Assinatura da marca: símbolo + "ORACLE CAPITAL" + descritor (o nome do app). */
export function Logo({ nome }: { nome: string }) {
  return (
    <a href={hrefRota('hoje')} className="logo" aria-label={`Oracle Capital · ${nome}: ir para Hoje`}>
      <SimboloOracle />
      <span className="logo-textos" aria-hidden="true">
        <span className="logo-marca">Oracle Capital</span>
        <span className="logo-descritor">{nome}</span>
      </span>
    </a>
  );
}

function Busca({ radar }: { radar: Radar | null }) {
  const [termo, setTermo] = useState('');
  const [aberta, setAberta] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const abrir = useAbrirHistorico();
  const setores = useMemo(() => (radar ? buscarSetores(radar, termo) : []), [radar, termo]);
  const ativos = useMemo(() => (radar ? buscarAtivos(todosPrecos(radar), termo, 12) : []), [radar, termo]);
  const fechar = () => {
    setAberta(false);
    setTermo('');
  };
  useEffect(() => {
    if (!aberta) return;
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberta(false);
    };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberta]);
  const mostrar = aberta && termo.trim() !== '';
  return (
    <div className="busca-topo" ref={caixa}>
      <label className="busca-campo">
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={termo}
          placeholder="Buscar ativo, setor ou índice"
          aria-label="Buscar ativo, setor ou índice"
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => {
            setTermo(e.target.value);
            setAberta(true);
          }}
          onFocus={() => setAberta(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') fechar();
            if (e.key === 'Enter') {
              const s = setores[0];
              const a = ativos[0];
              if (s) {
                ir('mercado', 'setores', s.setor);
                fechar();
              } else if (a) {
                abrir(a.id);
                fechar();
              }
            }
          }}
        />
      </label>
      {mostrar && (
        <div className="busca-resultados" role="listbox" aria-label="Resultados da busca">
          {!radar && <p className="busca-vazio">Carregue um Radar para buscar.</p>}
          {radar && !setores.length && !ativos.length && <p className="busca-vazio">Nada encontrado para “{termo}”.</p>}
          {setores.map((s) => (
            <a
              key={s.setor}
              role="option"
              aria-selected="false"
              className="busca-linha"
              href={hrefRota('mercado', 'setores', s.setor)}
              onClick={fechar}
            >
              <span>
                <span className="cod">SETOR</span>
                <span className="nm">{s.setor}</span>
              </span>
              <span className="z">{s.itens.length} ações</span>
            </a>
          ))}
          {ativos.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected="false"
              className="busca-linha"
              onClick={() => {
                abrir(p.id);
                fechar();
              }}
            >
              <span className="busca-ativo">
                <AtivoIcone id={p.id} grupo={p.grupo} nome={p.nome} regiao={p.regiao} />
                <span>
                  <span className="cod">{p.id}</span>
                  <span className="nm">{p.nome}</span>
                </span>
              </span>
              <Variacao item={p} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Menu superior escuro: logo → itens (com submenus) → busca → tema.
 * No computador o submenu abre ao passar o mouse ou clicar; até 1020 px, o botão ☰ abre a lista em tela cheia.
 */
export function MenuSuperior({
  rota,
  radar,
  nomeApp,
  tema,
  alternarTema,
}: {
  rota: Rota;
  radar: Radar | null;
  nomeApp: string;
  tema: 'claro' | 'escuro';
  alternarTema: () => void;
}) {
  const menu = useMemo(() => montarMenu(radar), [radar]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const ativo = itemAtivo(rota);
  const largo = () => window.innerWidth > 1020;
  const comMouse = () => window.matchMedia?.('(hover: hover)').matches ?? false;

  // Navegar fecha tudo.
  useEffect(() => {
    setAberto(null);
    setTelaCheia(false);
  }, [rota.aba, rota.sub, rota.arg]);

  useEffect(() => {
    const fora = (e: PointerEvent) => {
      if (!nav.current?.contains(e.target as Node)) setAberto(null);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(null);
        setTelaCheia(false);
      }
    };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-tela-cheia', telaCheia);
    return () => document.body.classList.remove('menu-tela-cheia');
  }, [telaCheia]);

  return (
    <div className={`menu-topo${telaCheia ? ' aberto' : ''}`}>
      <div className="menu-barra">
        <Logo nome={nomeApp} />
        <nav
          ref={nav}
          className="menu-itens"
          id="menu-principal"
          aria-label="Menu principal"
          onMouseLeave={() => {
            if (largo() && comMouse()) setAberto(null);
          }}
        >
          {menu.map((m) =>
            m.grupos ? (
              <div
                key={m.id}
                className={`menu-it${aberto === m.id ? ' aberto' : ''}`}
                onMouseEnter={() => {
                  if (largo() && comMouse()) setAberto(m.id);
                }}
              >
                <button
                  type="button"
                  className={`menu-lnk${ativo === m.id ? ' ativo' : ''}`}
                  aria-expanded={aberto === m.id}
                  aria-controls={`submenu-${m.id}`}
                  // Com mouse o submenu já abriu ao passar por cima: o clique só garante que fique aberto.
                  onClick={() => setAberto(largo() && comMouse() ? m.id : aberto === m.id ? null : m.id)}
                >
                  {m.nome}
                  <Seta />
                </button>
                <div id={`submenu-${m.id}`} className={`submenu${m.largo ? ' largo' : ''}`} hidden={aberto !== m.id}>
                  {m.grupos.map((g) => (
                    <div key={g.titulo} className="submenu-grupo">
                      <h6>{g.titulo}</h6>
                      {g.itens.map((f) => (
                        <a key={f.href} href={f.href} onClick={() => setAberto(null)}>
                          <span>{f.nome}</span>
                          {f.direita}
                        </a>
                      ))}
                    </div>
                  ))}
                  {m.extra}
                </div>
              </div>
            ) : (
              <div key={m.id} className="menu-it">
                <a
                  href={m.href}
                  className={`menu-lnk${ativo === m.id ? ' ativo' : ''}`}
                  aria-current={ativo === m.id ? 'page' : undefined}
                >
                  {m.nome}
                </a>
              </div>
            ),
          )}
        </nav>
        <Busca radar={radar} />
        <button
          type="button"
          className="icobtn"
          onClick={alternarTema}
          aria-label={tema === 'escuro' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          title="Alternar tema"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13z" fill="currentColor" />
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
        <BotaoCarregar compacto className="icobtn carregar-topo" />
        <button
          type="button"
          className="icobtn hamburguer"
          aria-label={telaCheia ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={telaCheia}
          aria-controls="menu-principal"
          onClick={() => setTelaCheia(!telaCheia)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            {telaCheia ? (
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
