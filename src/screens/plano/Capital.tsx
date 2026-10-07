import { useState } from 'react';
import { Money } from '../../components/Money';
import { useDebts, useSettings } from '../../hooks/useData';
import { updateSettings } from '../../lib/db/settings';
import { contribuicaoMensal, custoExtraSubir, custoParticipante } from '../../lib/finance/longevidade';
import { saldoPorPapel } from '../../lib/plano/acoes';
import { ValorSheet } from './ValorSheet';

export function Capital() {
  const s = useSettings();
  const debts = useDebts();
  const [fipe, setFipe] = useState(false);
  if (!s || !debts) return null;
  const cdc = saldoPorPapel(debts, 'cdc');
  return (
    <section className="card stack-sm" aria-labelledby="cp-titulo">
      <div className="row-between">
        <h2 id="cp-titulo" style={{ margin: 0 }}>
          Capital social
        </h2>
        <span className="money" style={{ fontSize: '1.3rem', fontWeight: 700 }}>
          <Money value={s.capital} />
        </span>
      </div>
      <div className="row" role="radiogroup" aria-label="Longevidade">
        {(['2/2', '6/6'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={s.longevidadeModo === m}
            className={`btn ${s.longevidadeModo === m ? 'btn-primary' : ''}`}
            onClick={() => updateSettings({ longevidadeModo: m })}
          >
            Longevidade {m}
          </button>
        ))}
      </div>
      <div className="small">
        Contribuição mensal <Money value={contribuicaoMensal(s.longevidadeModo, s.salarioBaseLongevidade)} /> (sua parte{' '}
        <Money value={custoParticipante(s.longevidadeModo, s.salarioBaseLongevidade)} />)
      </div>
      {s.longevidadeModo === '2/2' && (
        <div className="small muted">
          Subir para 6/6 custa <Money value={custoExtraSubir(s.salarioBaseLongevidade)} /> a mais por mês para você.
        </div>
      )}
      <h3 style={{ marginTop: 8 }}>Carro</h3>
      <div className="row-between small">
        <span>FIPE</span>
        <button type="button" className="btn btn-ghost" onClick={() => setFipe(true)}>
          <Money value={s.fipeCarro} /> · editar
        </button>
      </div>
      <div className="row-between small">
        <span>Patrimônio no carro (FIPE − saldo do CDC)</span>
        <Money value={s.fipeCarro - cdc} color />
      </div>
      {fipe && (
        <ValorSheet
          titulo="FIPE do carro"
          rotulo="Valor FIPE"
          botao="Salvar"
          inicial={s.fipeCarro}
          onClose={() => setFipe(false)}
          onConfirm={(v) => updateSettings({ fipeCarro: v })}
        />
      )}
    </section>
  );
}
