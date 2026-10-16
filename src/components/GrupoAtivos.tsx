import { useMemo, useState, type ReactNode } from 'react';
import type { Preco, Radar } from '../schema/radar';
import { diaMes, numero, partesValor } from '../lib/formato';
import { dadoAntigo } from '../lib/pregao';
import { serie } from '../lib/precos';
import { lerLocal, gravarLocal } from '../lib/local';
import { descreverRegra, ehRegra } from '../lib/config';
import { useAbrirHistorico } from './HistoricoAtivo';
import { Sparkline } from './Sparkline';

export type Visao = 'lista' | 'mapa';
export type Ordem = 'padrao' | 'alta' | 'baixa' | 'az';

const varNum = (p: Preco): number | null => p.variacao_pb ?? p.variacao_pct ?? null;

/** Código curto do ativo: o próprio id quando parece um ticker (PETR4, IBOV), senão o nome curto. */
export function rotuloAtivo(p: Preco): { principal: string; secundario: string | null } {
  if (p.nome_curto) return { principal: p.nome_curto, secundario: p.nome };
  if (/^[A-Z0-9]{3,7}$/.test(p.id)) return { principal: p.id, secundario: p.nome };
  return { principal: p.nome, secundario: null };
}

/** Intensidade da cor no mapa: juros em pb contam 10 pb como 1%. */
export function nivelMapa(p: Preco): string {
  const v = p.variacao_pb !== null && p.variacao_pb !== undefined ? p.variacao_pb / 10 : p.variacao_pct;
  if (v === null || v === undefined || v === 0) return 'n0';
  const a = Math.abs(v);
  const n = a < 0.5 ? 1 : a < 1.5 ? 2 : 3;
  return `${v > 0 ? 'a' : 'b'}${n}`;
}

export function ordenar(itens: Preco[], ordem: Ordem): Preco[] {
  if (ordem === 'padrao') return itens;
  const r = [...itens];
  if (ordem === 'az') return r.sort((a, b) => rotuloAtivo(a).principal.localeCompare(rotuloAtivo(b).principal, 'pt-BR'));
  const sinal = ordem === 'alta' ? -1 : 1;
  return r.sort((a, b) => {
    const va = varNum(a);
    const vb = varNum(b);
    if (va === null) return 1;
    if (vb === null) return -1;
    return (va - vb) * sinal;
  });
}

function Pilula({ p }: { p: Preco }) {
  const v = varNum(p);
  if (v === null) return <span className="pilula pilula-n">—</span>;
  const pb = p.variacao_pb !== null && p.variacao_pb !== undefined;
  const dir = v > 0 ? 'a' : v < 0 ? 'b' : 'n';
  const seta = v > 0 ? '▲' : v < 0 ? '▼' : '■';
  const txt = pb ? `${numero(Math.abs(v), 0, 1)} pb` : `${numero(Math.abs(v), 2)}%`;
  return (
    <span className={`pilula pilula-${dir}`}>
      <span aria-hidden="true">{seta} </span>
      <span className="sr-only">{v > 0 ? 'alta de ' : v < 0 ? 'queda de ' : 'estável '}</span>
      {txt}
    </span>
  );
}

function Preco({ p }: { p: Preco }) {
  if (p.valor === null || p.valor === undefined)
    return <span className="sem-preco">{p.grupo?.startsWith('acoes') ? 'sem preço' : 'não verificado'}</span>;
  const v = partesValor(p.valor, p.unidade);
  return (
    <span className="preco num">
      {v.prefixo && <span className="unid">{v.prefixo} </span>}
      {v.numero}
      {v.sufixo && <span className="unid"> {v.sufixo}</span>}
    </span>
  );
}

function Etiquetas({ p, edicaoData }: { p: Preco; edicaoData: string }) {
  if (p.periodo) return <span className="etq">semana {p.periodo}</span>;
  if (dadoAntigo(p, edicaoData)) return <span className="etq etq-antigo">dado de {diaMes(p.data_ref)}</span>;
  return null;
}

const CHAVE_FECHADOS = 'radar.grupos.fechados';
const CHAVE_ABERTOS = 'radar.grupos.abertos';

/**
 * Grupo recolhível de ativos (Mercado e Agro).
 * Cabeçalho com resumo (quantos subiram, caíram e estão sem dado); corpo em lista ou mapa de calor.
 */
export function GrupoAtivos({
  chave,
  titulo,
  itens,
  ausentes = [],
  edicaoData,
  visao,
  ordem,
  radares,
  topo,
  sempreAberto = false,
}: {
  chave: string;
  titulo: string;
  itens: Preco[];
  ausentes?: string[];
  edicaoData: string;
  visao: Visao;
  ordem: Ordem;
  radares: Radar[];
  topo?: ReactNode;
  sempreAberto?: boolean;
}) {
  const abrir = useAbrirHistorico();
  const [aberto, setAberto] = useState(() => {
    if (sempreAberto) return true;
    // Grupos grandes (ex.: todas as ações do Ibovespa) começam fechados, salvo se o usuário abriu antes.
    const fechados = lerLocal<string[]>(CHAVE_FECHADOS, []);
    const abertos = lerLocal<string[]>(CHAVE_ABERTOS, []);
    if (abertos.includes(chave)) return true;
    return itens.length > 0 && itens.length <= 15 && !fechados.includes(chave);
  });
  const alternar = () => {
    const fechados = new Set(lerLocal<string[]>(CHAVE_FECHADOS, []));
    const abertos = new Set(lerLocal<string[]>(CHAVE_ABERTOS, []));
    if (aberto) {
      fechados.add(chave);
      abertos.delete(chave);
    } else {
      fechados.delete(chave);
      abertos.add(chave);
    }
    gravarLocal(CHAVE_FECHADOS, [...fechados]);
    gravarLocal(CHAVE_ABERTOS, [...abertos]);
    setAberto(!aberto);
  };

  const altas = itens.filter((p) => (varNum(p) ?? 0) > 0).length;
  const baixas = itens.filter((p) => (varNum(p) ?? 0) < 0).length;
  const lista = useMemo(() => ordenar(itens, ordem), [itens, ordem]);
  const idCorpo = `grupo-${chave.replace(/\W/g, '-')}`;

  return (
    <section className={`grupo${aberto ? ' grupo-aberto' : ''}`}>
      <h2 className="grupo-cab">
        <button type="button" aria-expanded={aberto} aria-controls={idCorpo} onClick={alternar}>
          <span className="grupo-titulo">{titulo}</span>
          <span className="grupo-resumo">
            {altas > 0 && (
              <span className="txt-alta" title={`${altas} em alta`}>
                ▲ {altas}
              </span>
            )}
            {baixas > 0 && (
              <span className="txt-baixa" title={`${baixas} em queda`}>
                ▼ {baixas}
              </span>
            )}
            {ausentes.length > 0 && <span className="mudo">{ausentes.length} sem dado</span>}
            <span className="grupo-seta" aria-hidden="true">
              ▾
            </span>
          </span>
        </button>
      </h2>
      {aberto && (
        <div id={idCorpo} className="grupo-corpo">
          {topo}
          {visao === 'lista' ? (
            <ul className="linhas">
              {lista.map((p) => {
                const r = rotuloAtivo(p);
                const pontos = serie(radares, p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="linha-ativo"
                      onClick={() => abrir(p.id)}
                      aria-label={`${p.nome}: ver detalhes`}
                    >
                      <span className="la-nome">
                        <span className="la-tk">{r.principal}</span>
                        {r.secundario && <span className="la-sub">{r.secundario}</span>}
                        <Etiquetas p={p} edicaoData={edicaoData} />
                      </span>
                      <span className="la-spark">
                        {pontos.length >= 2 && <Sparkline pontos={pontos} largura={56} altura={22} />}
                      </span>
                      <span className="la-valor">
                        <Preco p={p} />
                        <Pilula p={p} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="mapa">
              {lista.map((p) => {
                const r = rotuloAtivo(p);
                const v = varNum(p);
                const pb = p.variacao_pb !== null && p.variacao_pb !== undefined;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`bloco mapa-${nivelMapa(p)}`}
                      onClick={() => abrir(p.id)}
                      aria-label={`${p.nome}: ver detalhes`}
                    >
                      <span className="bloco-tk">{r.principal}</span>
                      <span className="bloco-var num">
                        {v === null
                          ? '—'
                          : `${v > 0 ? '+' : v < 0 ? '−' : ''}${pb ? `${numero(Math.abs(v), 0, 1)} pb` : `${numero(Math.abs(v), 2)}%`}`}
                      </span>
                      <span className="bloco-preco">
                        <Preco p={p} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {ausentes.length > 0 && (
            <details className="ausentes">
              <summary>+ {ausentes.length} sem dado hoje</summary>
              <p className="mudo pequeno">
                {ausentes.map((id) => (ehRegra(id) ? `${id} (${descreverRegra(id)})` : id)).join(', ')}. Não vieram no arquivo
                desta edição.
              </p>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

/** Controles de visão (lista/mapa) e ordem, lembrados neste aparelho. */
export function useVisaoOrdem(tela: string): {
  visao: Visao;
  setVisao: (v: Visao) => void;
  ordem: Ordem;
  setOrdem: (o: Ordem) => void;
} {
  const [visao, setV] = useState<Visao>(() => lerLocal<Visao>(`radar.${tela}.visao`, 'lista'));
  const [ordem, setO] = useState<Ordem>(() => lerLocal<Ordem>(`radar.${tela}.ordem`, 'padrao'));
  return {
    visao,
    ordem,
    setVisao: (v) => {
      gravarLocal(`radar.${tela}.visao`, v);
      setV(v);
    },
    setOrdem: (o) => {
      gravarLocal(`radar.${tela}.ordem`, o);
      setO(o);
    },
  };
}

export function ControlesVisao({
  visao,
  setVisao,
  ordem,
  setOrdem,
  extra,
}: {
  visao: Visao;
  setVisao: (v: Visao) => void;
  ordem: Ordem;
  setOrdem: (o: Ordem) => void;
  extra?: ReactNode;
}) {
  return (
    <div className="controles">
      {extra}
      <div className="alternador" role="group" aria-label="Visão">
        <button type="button" aria-pressed={visao === 'lista'} onClick={() => setVisao('lista')}>
          ☰ Lista
        </button>
        <button type="button" aria-pressed={visao === 'mapa'} onClick={() => setVisao('mapa')}>
          ▦ Mapa
        </button>
      </div>
      <label className="ordem">
        <span className="sr-only">Ordenar</span>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar">
          <option value="padrao">Ordem padrão</option>
          <option value="alta">Maior alta</option>
          <option value="baixa">Maior queda</option>
          <option value="az">A–Z</option>
        </select>
      </label>
    </div>
  );
}
