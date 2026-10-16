import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { dataISOParaDate, diaMes, numeroAuto } from '../lib/formato';

export type SerieGrafico = { nome: string; pontos: { x: string; y: number }[] };

const CORES = ['--serie-1', '--serie-2', '--serie-3'];

function cor(variavel: string, el: HTMLElement): string {
  return getComputedStyle(el).getPropertyValue(variavel).trim() || '#888';
}

/**
 * Gráfico de linhas (uPlot). As séries podem ter datas diferentes: o eixo junta todas
 * e deixa buracos onde uma série não tem valor.
 */
export function Grafico({
  series,
  altura = 260,
  formatar = numeroAuto,
  rotulo,
}: {
  series: SerieGrafico[];
  altura?: number;
  formatar?: (v: number) => string;
  rotulo: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const datas = [...new Set(series.flatMap((s) => s.pontos.map((p) => p.x)))].sort();
    const xs = datas.map((d) => dataISOParaDate(d).getTime() / 1000);
    const ys = series.map((s) => {
      const m = new Map(s.pontos.map((p) => [p.x, p.y]));
      return datas.map((d) => m.get(d) ?? null);
    });
    const texto = cor('--texto-mudo', el);
    const grade = cor('--borda', el);
    const opcoes: uPlot.Options = {
      width: el.clientWidth || 300,
      height: altura,
      legend: { show: series.length > 1 },
      cursor: { drag: { x: false, y: false } },
      scales: { x: { time: true } },
      axes: [
        {
          stroke: texto,
          grid: { stroke: grade, width: 1 },
          ticks: { stroke: grade },
          values: (_u, vals) => vals.map((v) => diaMes(new Date(v * 1000).toISOString().slice(0, 10))),
        },
        {
          stroke: texto,
          grid: { stroke: grade, width: 1 },
          ticks: { stroke: grade },
          size: 64,
          values: (_u, vals) => vals.map((v) => formatar(v)),
        },
      ],
      series: [
        { value: (_u, v) => (v === null ? '—' : diaMes(new Date(v * 1000).toISOString().slice(0, 10))) },
        ...series.map((s, i) => ({
          label: s.nome,
          stroke: cor(CORES[i % CORES.length]!, el),
          width: 2,
          spanGaps: true,
          points: { show: true, size: 6 },
          value: (_u: uPlot, v: number | null) => (v === null ? '—' : formatar(v)),
        })),
      ],
    };
    const plot = new uPlot(opcoes, [xs, ...ys] as uPlot.AlignedData, el);
    const obs = new ResizeObserver(() => plot.setSize({ width: el.clientWidth, height: altura }));
    obs.observe(el);
    return () => {
      obs.disconnect();
      plot.destroy();
    };
  }, [series, altura, formatar]);

  return <div ref={caixa} className="grafico" role="img" aria-label={rotulo} />;
}
