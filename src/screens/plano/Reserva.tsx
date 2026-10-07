import { useState } from 'react';
import { Money } from '../../components/Money';
import { useSettings } from '../../hooks/useData';
import { db } from '../../lib/db/db';
import { RESERVA_MINIMA } from '../../lib/finance/extraordinarios';
import { moverReserva } from '../../lib/plano/acoes';
import { ValorSheet } from './ValorSheet';

export function Reserva() {
  const s = useSettings();
  const [acao, setAcao] = useState<'depositar' | 'retirar' | null>(null);
  if (!s) return null;
  const pct = Math.min(1, Math.max(0, s.reserva / RESERVA_MINIMA));
  return (
    <section className="card stack-sm" aria-labelledby="rs-titulo">
      <div className="row-between">
        <h2 id="rs-titulo" style={{ margin: 0 }}>
          Reserva
        </h2>
        <span className="money" style={{ fontSize: '1.3rem', fontWeight: 700 }}>
          <Money value={s.reserva} />
        </span>
      </div>
      <div
        className={`bar ${pct >= 1 ? 'pos' : 'warn'}`}
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reserva mínima"
      >
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="small muted">
        {pct >= 1 ? (
          'Reserva mínima de R$ 15 mil atingida.'
        ) : (
          <>
            Faltam <Money value={RESERVA_MINIMA - s.reserva} /> para R$ 15 mil.
          </>
        )}
      </span>
      <div className="row">
        <button type="button" className="btn" onClick={() => setAcao('depositar')}>
          Depositar
        </button>
        <button type="button" className="btn" onClick={() => setAcao('retirar')}>
          Retirar
        </button>
      </div>
      {acao && (
        <ValorSheet
          titulo={acao === 'depositar' ? 'Depositar na reserva' : 'Retirar da reserva'}
          rotulo="Valor"
          botao={acao === 'depositar' ? 'Depositar' : 'Retirar'}
          onClose={() => setAcao(null)}
          onConfirm={(v) => moverReserva(db, acao === 'depositar' ? v : -v)}
        />
      )}
    </section>
  );
}
