import { useState, type PointerEvent } from 'react';
import type { Ponto } from '../lib/precos';
import { diaMes } from '../lib/formato';
import { ehTaxa, textoVariacao, valorDica, variacaoDia } from '../lib/tooltip';

/**
 * Mini-gráfico em SVG puro. Com um ponto só, mostra um marcador.
 * Ao passar o mouse, linha-guia, ponto destacado e uma dica de uma linha (data · valor · variação).
 */
export function Sparkline({
  pontos,
  largura = 96,
  altura = 28,
  unidade,
}: {
  pontos: Ponto[];
  largura?: number;
  altura?: number;
  unidade?: string | null;
}) {
  const [sel, setSel] = useState<{ i: number; esq: number; topo: number } | null>(null);
  if (!pontos.length) return <svg className="spark" width={largura} height={altura} aria-hidden="true" />;
  const ys = pontos.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const faixa = max - min || 1;
  const pad = 3;
  const x = (i: number) => (pontos.length === 1 ? largura / 2 : pad + (i * (largura - 2 * pad)) / (pontos.length - 1));
  const y = (v: number) => (max === min ? altura / 2 : altura - pad - ((v - min) * (altura - 2 * pad)) / faixa);
  const d = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const ultimo = pontos[pontos.length - 1]!;
  const primeiro = pontos[0]!;
  const tom = ultimo.y > primeiro.y ? 'alta' : ultimo.y < primeiro.y ? 'baixa' : 'estavel';

  const mover = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch' || pontos.length < 2) return;
    const r = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - r.left) / r.width) * largura;
    const i = Math.max(0, Math.min(pontos.length - 1, Math.round(((rel - pad) / (largura - 2 * pad)) * (pontos.length - 1))));
    setSel({ i, esq: r.left + (x(i) / largura) * r.width, topo: r.top });
  };

  const p = sel ? pontos[sel.i] : undefined;
  const taxa = ehTaxa(unidade, pontos);
  const dica = p && sel ? `${diaMes(p.x)} · ${valorDica(p.y, unidade)} · ${textoVariacao(variacaoDia(pontos, sel.i, taxa))}` : '';

  return (
    <>
      <svg
        className={`spark spark-${tom}`}
        width={largura}
        height={altura}
        viewBox={`0 0 ${largura} ${altura}`}
        role="img"
        aria-label={pontos.length === 1 ? 'Histórico: só uma edição carregada' : `Histórico de ${pontos.length} pontos`}
        onPointerMove={mover}
        onPointerLeave={() => setSel(null)}
      >
        {pontos.length > 1 && <path d={d} fill="none" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />}
        {sel && p && (
          <line className="spark-guia" x1={x(sel.i)} x2={x(sel.i)} y1={0} y2={altura} strokeWidth="1" strokeDasharray="2 2" />
        )}
        <circle cx={x(pontos.length - 1)} cy={y(ultimo.y)} r="2.5" />
        {sel && p && <circle className="spark-sel" cx={x(sel.i)} cy={y(p.y)} r="3.5" />}
      </svg>
      {sel && p && (
        <span
          className="dica-spark"
          aria-hidden="true"
          style={{
            left: Math.min(Math.max(sel.esq, 110), (typeof window !== 'undefined' ? window.innerWidth : 1e4) - 110),
            top: sel.topo,
          }}
        >
          {dica}
        </span>
      )}
    </>
  );
}
