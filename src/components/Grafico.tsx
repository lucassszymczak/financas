import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { dataISOParaDate, diaMes, numero, numeroAuto } from '../lib/formato';
import type { Ponto } from '../lib/precos';
import {
  ehTaxa,
  proximoValido,
  textoVariacao,
  tituloDica,
  valorDica,
  variacaoDia,
  variacaoPeriodo,
  type VariacaoDica,
} from '../lib/tooltip';
import { AtivoIcone } from './AtivoIcone';

export type SerieGrafico = {
  /** Id do ativo (para o ícone na legenda). */
  id?: string;
  grupo?: string | null;
  nome: string;
  pontos: Ponto[];
  /** Unidade do ativo, para a dica mostrar "205.079 pts", "R$ 5,05"… */
  unidade?: string | null;
  /** No modo normalizado: os valores reais, para a dica mostrar o valor de verdade. */
  reais?: Ponto[];
  /** Valor intradiário de hoje: aparece separado, com linha tracejada a partir do último fechamento. */
  intradiario?: (Ponto & { hora: string | null }) | null;
};

const CORES = ['--serie-1', '--serie-2', '--serie-3'];

function cor(variavel: string, el: HTMLElement): string {
  return getComputedStyle(el).getPropertyValue(variavel).trim() || '#888';
}

type LinhaDica = { nome: string; cor: string; valor: string; dia: VariacaoDica | null; extra: string | null };
type Dica = { titulo: string; linhas: LinhaDica[]; esquerda: number; lado: 'dir' | 'esq' };

/** Conteúdo da dica no índice `idx` do eixo de datas. */
function montarDica(
  series: SerieGrafico[],
  datas: string[],
  idx: number,
  normalizado: boolean,
): Omit<Dica, 'esquerda' | 'lado'> | null {
  const x = datas[idx];
  if (!x) return null;
  let intradiario: { hora: string | null } | null = null;
  const linhas = series.map((s, i): LinhaDica => {
    const corSerie = `var(${CORES[i % CORES.length]})`;
    const base = normalizado && s.reais ? s.reais : s.pontos;
    const taxa = ehTaxa(s.unidade, base);
    let pts = base;
    let j = base.findIndex((p) => p.x === x);
    if (j < 0 && s.intradiario && s.intradiario.x === x) {
      pts = [...base, s.intradiario];
      j = pts.length - 1;
      intradiario = s.intradiario;
    }
    const p = pts[j];
    if (!p) return { nome: s.nome, cor: corSerie, valor: 'sem dado neste dia', dia: null, extra: null };
    const periodo = variacaoPeriodo(pts, j, taxa);
    let extra: string | null = null;
    if (normalizado) {
      const n = s.pontos.find((q) => q.x === x)?.y;
      const desde = periodo ? `desde o início ${periodo.texto}` : 'início do período';
      extra = `${desde}${n !== undefined ? ` (normalizado ${numero(n, 1)})` : ''}`;
    } else if (periodo && series.length === 1) {
      extra = `no período: ${periodo.texto}`;
    }
    return { nome: s.nome, cor: corSerie, valor: valorDica(p.y, s.unidade), dia: variacaoDia(pts, j, taxa), extra };
  });
  return { titulo: tituloDica(x, intradiario), linhas };
}

const textoDica = (d: Omit<Dica, 'esquerda' | 'lado'>) =>
  `${d.titulo}. ` +
  d.linhas
    .map((l) => `${l.nome}: ${l.valor}${l.dia ? `, ${textoVariacao(l.dia)}` : ''}${l.extra ? `, ${l.extra}` : ''}`)
    .join('. ');

/**
 * Gráfico de linhas (uPlot). As séries podem ter datas diferentes: o eixo junta todas
 * e deixa buracos onde uma série não tem valor. Ao passar o mouse (ou com ← →, com o gráfico em foco)
 * aparece a dica com data, valor e variação do dia.
 */
export function Grafico({
  series,
  altura = 260,
  formatar = numeroAuto,
  rotulo,
  normalizado = false,
}: {
  series: SerieGrafico[];
  altura?: number;
  formatar?: (v: number) => string;
  rotulo: string;
  normalizado?: boolean;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);
  const tema = useTemaDocumento();
  const [dica, setDica] = useState<Dica | null>(null);

  const datas = useMemo(
    () => [...new Set(series.flatMap((s) => [...s.pontos.map((p) => p.x), ...(s.intradiario ? [s.intradiario.x] : [])]))].sort(),
    [series],
  );
  // Dias em que alguma série tem valor (o teclado pula os demais).
  const comValor = useMemo(
    () => datas.map((d) => (series.some((s) => s.pontos.some((p) => p.x === d) || s.intradiario?.x === d) ? 1 : null)),
    [datas, series],
  );

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    // Datas à meia-noite UTC, com o eixo em UTC: as marcas caem exatamente nos dias.
    const xs = datas.map((d) => dataISOParaDate(d).getTime() / 1000 - 12 * 3600);
    const ys = series.map((s) => {
      const m = new Map(s.pontos.map((p) => [p.x, p.y]));
      return datas.map((d) => m.get(d) ?? null);
    });
    // Trecho tracejado do último fechamento até o valor intradiário (só no gráfico de um ativo).
    const intra = series.length === 1 ? series[0]!.intradiario : null;
    const ultimoFech = series[0]?.pontos.at(-1);
    const yIntra =
      intra && ultimoFech ? datas.map((d) => (d === intra.x ? intra.y : d === ultimoFech.x ? ultimoFech.y : null)) : null;
    const texto = cor('--texto-mudo', el);
    const grade = cor('--borda', el);
    const atualizar = (u: uPlot) => {
      const idx = u.cursor.idx;
      if (idx === null || idx === undefined || u.cursor.left === undefined || u.cursor.left < 0) {
        setDica(null);
        return;
      }
      const d = montarDica(series, datas, idx, normalizado);
      if (!d) return setDica(null);
      const esquerda = u.over.offsetLeft + u.valToPos(xs[idx]!, 'x');
      setDica({ ...d, esquerda, lado: esquerda > el.clientWidth / 2 ? 'esq' : 'dir' });
    };
    const opcoes: uPlot.Options = {
      width: el.clientWidth || 300,
      height: altura,
      legend: { show: false },
      cursor: {
        drag: { x: false, y: false },
        y: false,
        points: { size: 9, width: 2 },
      },
      scales: { x: { time: true } },
      tzDate: (ts) => uPlot.tzDate(new Date(ts * 1000), 'Etc/UTC'),
      hooks: { setCursor: [atualizar] },
      axes: [
        {
          stroke: texto,
          grid: { stroke: grade, width: 1 },
          ticks: { stroke: grade },
          // Só marcas em dias inteiros (os dados são diários).
          incrs: [1, 2, 7, 14, 30, 61, 91, 182, 365].map((d) => d * 86400),
          space: 50,
          values: (_u, vals) => vals.map((v) => diaMes(new Date(v * 1000).toISOString().slice(0, 10))),
        },
        {
          stroke: texto,
          grid: { stroke: grade, width: 1 },
          ticks: { stroke: grade },
          // Largura do eixo conforme o maior rótulo (números grandes não ficam cortados).
          size: (_u, vals) => Math.max(44, ...(vals ?? []).map((v) => String(v).length * 7.2 + 18)),
          values: (_u, vals) => vals.map((v) => (Math.abs(v) >= 1000 ? numero(v, 0) : formatar(v))),
        },
      ],
      series: [
        {},
        ...series.map((s, i) => ({
          label: s.nome,
          stroke: cor(CORES[i % CORES.length]!, el),
          width: 2,
          spanGaps: true,
          points: { show: true, size: 6 },
        })),
        ...(yIntra
          ? [
              {
                label: 'Intradiário',
                stroke: cor(CORES[0]!, el),
                width: 2,
                dash: [5, 4],
                spanGaps: true,
                points: { show: true, size: 7, fill: cor('--superficie', el) },
              },
            ]
          : []),
      ],
    };
    const u = new uPlot(opcoes, [xs, ...ys, ...(yIntra ? [yIntra] : [])] as uPlot.AlignedData, el);
    plot.current = u;
    const obs = new ResizeObserver(() => u.setSize({ width: el.clientWidth, height: altura }));
    obs.observe(el);
    return () => {
      obs.disconnect();
      u.destroy();
      plot.current = null;
      setDica(null);
    };
  }, [series, datas, altura, formatar, tema, normalizado]);

  const mover = (e: KeyboardEvent<HTMLDivElement>) => {
    const u = plot.current;
    if (!u || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End')) return;
    e.preventDefault();
    const atual = u.cursor.idx ?? null;
    let idx: number;
    if (e.key === 'Home') idx = proximoValido(comValor, -1, 1);
    else if (e.key === 'End') idx = proximoValido(comValor, comValor.length, -1);
    else if (atual === null) idx = proximoValido(comValor, comValor.length, -1);
    else idx = proximoValido(comValor, atual, e.key === 'ArrowLeft' ? -1 : 1);
    const x = u.data[0][idx];
    if (x === undefined) return;
    u.setCursor({ left: u.valToPos(x, 'x'), top: u.over.clientHeight / 2 });
  };

  return (
    <div className="grafico-caixa">
      <div
        ref={caixa}
        className="grafico"
        role="group"
        tabIndex={0}
        aria-label={`${rotulo}. Use as setas para a esquerda e para a direita para percorrer os dias.`}
        onKeyDown={mover}
        onBlur={() => plot.current?.setCursor({ left: -10, top: -10 })}
      />
      {dica && (
        <div className={`dica-grafico dica-${dica.lado}`} style={{ left: dica.esquerda }} aria-hidden="true">
          <div className="dica-titulo">{dica.titulo}</div>
          {dica.linhas.map((l) => (
            <div key={l.nome} className="dica-linha">
              {series.length > 1 && <span className="dica-cor" style={{ background: l.cor }} />}
              {series.length > 1 && <span className="dica-nome">{l.nome}</span>}
              <span className="dica-valor num">{l.valor}</span>
              {l.dia && (
                <span className={`dica-var var-${l.dia.dir}`}>
                  {l.dia.texto}
                  {l.dia.calculada && <span className="dica-calc"> (calculada)</span>}
                </span>
              )}
              {l.extra && <span className="dica-extra">{l.extra}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        {dica ? textoDica(dica) : ''}
      </div>
      {series.length > 1 && (
        <ul className="grafico-legenda">
          {series.map((s, i) => (
            <li key={s.nome}>
              <span className="dica-cor" style={{ background: `var(${CORES[i % CORES.length]})` }} />
              {s.id && <AtivoIcone id={s.id} grupo={s.grupo} nome={s.nome} tamanho={18} />}
              {s.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tema aplicado no <html>, para redesenhar o gráfico com as cores certas. */
function useTemaDocumento(): string | undefined {
  const [tema, setTema] = useState(() => document.documentElement.dataset.theme);
  useEffect(() => {
    const obs = new MutationObserver(() => setTema(document.documentElement.dataset.theme));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    return () => obs.disconnect();
  }, []);
  return tema;
}
