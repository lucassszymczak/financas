import type { Ponto } from '../lib/precos';

/** Mini-gráfico em SVG puro. Com um ponto só, mostra um marcador. */
export function Sparkline({ pontos, largura = 96, altura = 28 }: { pontos: Ponto[]; largura?: number; altura?: number }) {
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
  return (
    <svg
      className={`spark spark-${tom}`}
      width={largura}
      height={altura}
      viewBox={`0 0 ${largura} ${altura}`}
      role="img"
      aria-label={pontos.length === 1 ? 'Histórico: só uma edição carregada' : `Histórico de ${pontos.length} pontos`}
    >
      {pontos.length > 1 && <path d={d} fill="none" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />}
      <circle cx={x(pontos.length - 1)} cy={y(ultimo.y)} r="2.5" />
    </svg>
  );
}
