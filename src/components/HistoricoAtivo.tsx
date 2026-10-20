import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useEstado } from '../state';
import type { Preco, Radar } from '../schema/radar';
import { mapaPrecos, nomeGrupo, nomeRegiao, serie, type Ponto } from '../lib/precos';
import { dataCurta, diaMes, numero, numeroAuto, somaDias, valorComUnidade } from '../lib/formato';
import { limitesCruzados } from '../lib/alertas';
import { dadoAntigo } from '../lib/pregao';
import { Grafico } from './Grafico';
import { Estrelas, Leitura, Selo, SeloOrigem, Variacao } from './Basicos';
import { Modal } from './Modal';
import { AtivoIcone } from './AtivoIcone';

/** Abre o detalhe de um ativo; `aoFechar` é chamado quando o pop-up fecha (a fita usa para voltar a rodar). */
type Abrir = (id: string, aoFechar?: () => void) => void;
const Ctx = createContext<Abrir>(() => {});

const PERIODOS = [
  { dias: 7, nome: '7d' },
  { dias: 30, nome: '30d' },
  { dias: 90, nome: '90d' },
  { dias: 0, nome: 'Tudo' },
];

/** Notícias e destaques do dia que citam o ativo (pelo código ou pelo nome). */
export function noticiasDoAtivo(r: Radar, p: Preco) {
  const nome = p.nome.toLowerCase();
  const curto = (p.nome_curto ?? '').toLowerCase();
  const primeiro = nome.split(/[\s(]/)[0] ?? '';
  const termos = [p.id.toLowerCase(), nome, curto, primeiro.length >= 4 ? primeiro : ''].filter(Boolean);
  const cita = (textos: (string | null | undefined)[]) => {
    const t = textos.filter(Boolean).join(' ').toLowerCase();
    return termos.some((x) =>
      new RegExp(`(^|[^\\p{L}\\d])${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}\\d]|$)`, 'u').test(t),
    );
  };
  return [
    ...r.destaques
      .filter((d) => cita([...d.ativos_afetados, d.titulo, d.o_que]))
      .map((d) => ({ id: d.id, emoji: d.emoji, titulo: d.titulo, texto: d.o_que })),
    ...r.noticias
      .filter((n) => cita([...n.ativos_afetados, n.titulo, n.resumo]))
      .map((n) => ({ id: n.id, emoji: n.emoji, titulo: n.titulo, texto: n.resumo })),
  ];
}

const pctSinal = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${numero(Math.abs(v), 2)}%`;
const tomVar = (v: number) => (v > 0 ? 'txt-alta' : v < 0 ? 'txt-baixa' : '');

/** Dados extras do pregão que vierem no arquivo: [rótulo, valor, classe de cor]. */
export function extrasDoAtivo(p: Preco): [string, string, string][] {
  const r: [string, string, string][] = [];
  const n = (v: number | null | undefined) => v !== null && v !== undefined && Number.isFinite(v);
  if (n(p.abertura)) r.push(['Abertura', numeroAuto(p.abertura), '']);
  if (n(p.minima) && n(p.maxima)) r.push(['Mínima · máxima do dia', `${numeroAuto(p.minima)} · ${numeroAuto(p.maxima)}`, '']);
  if (n(p.fechamento_anterior)) r.push(['Fechamento anterior', numeroAuto(p.fechamento_anterior), '']);
  if (n(p.volume_financeiro)) r.push(['Volume financeiro', volume(p.volume_financeiro!), '']);
  for (const [campo, rotulo] of [
    ['var_semana_pct', 'Na semana'],
    ['var_mes_pct', 'No mês'],
    ['var_ano_pct', 'No ano'],
    ['var_12m_pct', 'Em 12 meses'],
  ] as const) {
    const v = p[campo];
    if (n(v)) r.push([rotulo, pctSinal(v!), tomVar(v!)]);
  }
  if (n(p.minima_52s) && n(p.maxima_52s))
    r.push(['Faixa de 52 semanas', `${numeroAuto(p.minima_52s)} · ${numeroAuto(p.maxima_52s)}`, '']);
  if (p.setor) r.push(['Setor', p.setor, '']);
  return r;
}

/** Volume em R$ abreviado: 1,2 bi, 350 mi, 12 mil. */
export function volume(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `R$ ${numero(v / 1e9, 1, 2)} bi`;
  if (a >= 1e6) return `R$ ${numero(v / 1e6, 1, 1)} mi`;
  if (a >= 1e3) return `R$ ${numero(v / 1e3, 0, 0)} mil`;
  return `R$ ${numero(v, 0, 0)}`;
}

/** Estatísticas da série nas edições carregadas. */
export function resumoSerie(pontos: Ponto[], juros: boolean) {
  if (pontos.length < 2) return null;
  const ys = pontos.map((p) => p.y);
  const primeiro = pontos[0]!;
  const ultimo = pontos[pontos.length - 1]!;
  const variacao = juros
    ? `${ultimo.y >= primeiro.y ? '+' : '−'}${numero(Math.abs(ultimo.y - primeiro.y) * 100, 0)} pb`
    : `${ultimo.y >= primeiro.y ? '+' : '−'}${numero(Math.abs(ultimo.y / primeiro.y - 1) * 100, 2)}%`;
  return { min: Math.min(...ys), max: Math.max(...ys), desde: primeiro.x, variacao, alta: ultimo.y >= primeiro.y };
}

function Detalhe({ id, fechar }: { id: string; fechar: () => void }) {
  const { edicoes, atual, config } = useEstado();
  const [periodo, setPeriodo] = useState(0);
  const radares = useMemo(() => edicoes.map((e) => e.radar), [edicoes]);
  const todos = useMemo(() => serie(radares, id), [radares, id]);
  const pontos = useMemo(() => {
    const ultima = todos[todos.length - 1]?.x;
    return periodo && ultima ? todos.filter((p) => p.x >= somaDias(ultima, -periodo)) : todos;
  }, [todos, periodo]);
  const item = atual ? mapaPrecos(atual.radar).get(id) : undefined;
  const series = useMemo(() => [{ nome: item?.nome ?? id, pontos }], [item?.nome, id, pontos]);
  const juros = !!item && item.variacao_pb !== null && item.variacao_pb !== undefined;
  const resumo = resumoSerie(pontos, juros);
  const limites = config.limites.filter((l) => l.ativo && l.id === id);
  const cruzados = item ? limitesCruzados(item, config.limites) : [];
  const relacionadas = item && atual ? noticiasDoAtivo(atual.radar, item) : [];
  const grupo = item?.grupo ? nomeGrupo(item.grupo) : item?.regiao ? nomeRegiao(item.regiao) : null;

  return (
    <Modal
      largo
      titulo={
        <span className="titulo-ativo">
          <AtivoIcone id={id} grupo={item?.grupo} nome={item?.nome ?? id} regiao={item?.regiao} tamanho={24} />
          {item?.nome ?? id}
        </span>
      }
      onFechar={fechar}
      cabecalho={
        item && (
          <div className="det-cab">
            <span className="mudo pequeno">
              {id}
              {grupo && ` · ${grupo}`}
            </span>
            <p className="det-preco">
              <span className="num">{valorComUnidade(item.valor, item.unidade)}</span> <Variacao item={item} grande />
            </p>
          </div>
        )
      }
    >
      {todos.length >= 2 ? (
        <>
          <div className="alternador det-periodo" role="group" aria-label="Período do gráfico">
            {PERIODOS.map((p) => (
              <button key={p.dias} type="button" aria-pressed={periodo === p.dias} onClick={() => setPeriodo(p.dias)}>
                {p.nome}
              </button>
            ))}
          </div>
          {pontos.length >= 2 ? (
            <Grafico series={series} rotulo={`Histórico de ${item?.nome ?? id}`} altura={220} />
          ) : (
            <Leitura titulo="Histórico" texto="Só há um valor neste período. Escolha um período maior." />
          )}
        </>
      ) : (
        <Leitura
          titulo="Histórico"
          texto={
            todos.length === 1
              ? `Só há um valor (${dataCurta(todos[0]!.x)}). O gráfico aparece a partir de duas edições carregadas.`
              : 'Nenhum valor numérico deste ativo nas edições salvas.'
          }
        />
      )}

      {item && (
        <dl className="det-grade">
          <div>
            <dt>Data de referência</dt>
            <dd>
              {item.periodo ? `semana ${item.periodo}` : dataCurta(item.data_ref)}{' '}
              {atual && dadoAntigo(item, atual.data) && <Selo tom="aviso">dado antigo</Selo>} <SeloOrigem item={item} />
            </dd>
          </div>
          {resumo && (
            <>
              <div>
                <dt>Mínimo · máximo</dt>
                <dd className="num">
                  {numeroAuto(resumo.min)} · {numeroAuto(resumo.max)}
                </dd>
              </div>
              <div>
                <dt>Desde {diaMes(resumo.desde)}</dt>
                <dd className={`num ${resumo.alta ? 'txt-alta' : 'txt-baixa'}`}>{resumo.variacao}</dd>
              </div>
            </>
          )}
          {extrasDoAtivo(item).map(([rotulo, valor, tom]) => (
            <div key={rotulo}>
              <dt>{rotulo}</dt>
              <dd className={`num${tom ? ` ${tom}` : ''}`}>{valor}</dd>
            </div>
          ))}
          <div>
            <dt>Edições com dado</dt>
            <dd className="num">{todos.length}</dd>
          </div>
          {item.fonte && (
            <div>
              <dt>Fonte</dt>
              <dd>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer noopener">
                    {item.fonte}
                  </a>
                ) : (
                  item.fonte
                )}{' '}
                <Estrelas nota={item.nota_fonte} />
              </dd>
            </div>
          )}
          {limites.length > 0 && (
            <div>
              <dt>Limite de alerta</dt>
              <dd>
                {limites.map((l) => (
                  <span key={l.tipo} className={cruzados.includes(l) ? 'limite-cruzado' : undefined}>
                    {l.tipo === 'acima' ? 'acima de' : 'abaixo de'} {numeroAuto(l.valor)}
                    {cruzados.includes(l) ? ' · cruzado' : ''}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}

      {relacionadas.length > 0 && (
        <div className="det-noticias">
          <h4>No Radar de hoje</h4>
          <ul>
            {relacionadas.map((n) => (
              <li key={n.id}>
                <strong>
                  {n.emoji && <span aria-hidden="true">{n.emoji} </span>}
                  {n.titulo}
                </strong>
                <span>{n.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

/** Pop-up com detalhes e histórico de um ativo (aberto pela fita, busca, KPIs, listas e tabelas). */
export function HistoricoAtivoProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const aoFechar = useRef<(() => void) | undefined>(undefined);
  const abrir = useCallback<Abrir>((novo, cb) => {
    const anterior = aoFechar.current;
    aoFechar.current = cb;
    if (anterior && anterior !== cb) anterior();
    setId(novo);
  }, []);
  const fechar = useCallback(() => {
    const cb = aoFechar.current;
    aoFechar.current = undefined;
    setId(null);
    cb?.();
  }, []);
  return (
    <Ctx.Provider value={abrir}>
      {children}
      {id && <Detalhe key={id} id={id} fechar={fechar} />}
    </Ctx.Provider>
  );
}

export const useAbrirHistorico = () => useContext(Ctx);
