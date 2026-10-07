import { formatBRLSigned } from '../lib/money';

const MIN = -300_000;
const MAX = 300_000;

function pos(v: number): number {
  return ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 100;
}

/** Régua de −3.000 a +3.000 com marcas em 0 e −500. */
export function Regua({ valor, previsao }: { valor: number; previsao?: number | null }) {
  return (
    <div className="regua" role="img" aria-label={`Resultado ${formatBRLSigned(valor)} na régua de −3.000 a +3.000`}>
      <div className="regua-trilho">
        <span className="regua-zona-neg" style={{ width: `${pos(-50_000)}%` }} />
        <span className="regua-marca" style={{ left: `${pos(0)}%` }} />
        <span className="regua-marca regua-marca-limite" style={{ left: `${pos(-50_000)}%` }} />
        {previsao !== null && previsao !== undefined && (
          <span className="regua-ponto regua-previsao" style={{ left: `${pos(previsao)}%` }} />
        )}
        <span className={`regua-ponto ${valor >= -50_000 ? 'ok' : 'ruim'}`} style={{ left: `${pos(valor)}%` }} />
      </div>
      <div className="regua-rotulos tiny muted">
        <span style={{ left: '0%' }}>−3 mil</span>
        <span style={{ left: `${pos(-50_000)}%` }}>−500</span>
        <span style={{ left: `${pos(0)}%` }}>0</span>
        <span style={{ left: '100%' }}>+3 mil</span>
      </div>
    </div>
  );
}
