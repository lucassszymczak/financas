import { useState } from 'react';
import { SelectField } from '../../components/Field';
import { Money } from '../../components/Money';
import { MoneyInput } from '../../components/MoneyInput';
import { Sheet } from '../../components/Sheet';
import { useMonthTransactions, useSettings } from '../../hooks/useData';
import { CATEGORIAS } from '../../lib/db/categories';
import { updateSettings } from '../../lib/db/settings';
import { currentMonth, daysInMonth } from '../../lib/dates';
import { statusTeto, totaisPorCategoria } from '../../lib/finance';

export function Tetos() {
  const s = useSettings();
  const mes = currentMonth();
  const txs = useMonthTransactions(mes);
  const [edit, setEdit] = useState<{ categoria: string; valor: number | null } | null>(null);
  if (!s || !txs) return null;
  const gastos = new Map(totaisPorCategoria(txs, 'saida').map((c) => [c.categoria, c.total]));
  const dia = new Date().getDate();
  const dias = daysInMonth(mes);
  const tetos = Object.entries(s.tetos).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <section className="card stack-sm" aria-labelledby="tt-titulo">
      <div className="row-between">
        <h2 id="tt-titulo" style={{ margin: 0 }}>
          Tetos
        </h2>
        <button
          type="button"
          className="btn"
          onClick={() => setEdit({ categoria: CATEGORIAS.saida.find((c) => !(c in s.tetos)) ?? 'Outros', valor: null })}
        >
          + Teto
        </button>
      </div>
      <p className="tiny muted">
        A marca vertical mostra o ritmo: quanto do teto já era esperado até hoje (dia {dia} de {dias}).
      </p>
      {tetos.length === 0 && <p className="small muted">Nenhum teto definido.</p>}
      {tetos.map(([categoria, teto]) => {
        const st = statusTeto(gastos.get(categoria) ?? 0, teto, dia, dias);
        const cls = st.nivel === 'vermelho' ? 'neg' : st.nivel === 'amarelo' || st.acimaDoRitmo ? 'warn' : 'pos';
        return (
          <button
            key={categoria}
            type="button"
            className="cat-bar"
            onClick={() => setEdit({ categoria, valor: teto })}
            style={{ background: 'none', border: 0, padding: '6px 0', textAlign: 'left', cursor: 'pointer', width: '100%' }}
          >
            <div className="row-between small">
              <span>
                {categoria}
                {st.nivel === 'vermelho' && <span className="badge badge-neg"> estourou</span>}
                {st.nivel !== 'vermelho' && st.acimaDoRitmo && <span className="badge badge-warn"> acima do ritmo</span>}
              </span>
              <span>
                <Money value={st.gasto} />{' '}
                <span className="muted">
                  / <Money value={teto} semCentavos />
                </span>
              </span>
            </div>
            <div className={`bar ${cls}`} style={{ position: 'relative' }} aria-hidden="true">
              <span style={{ width: `${Math.min(100, st.pct * 100)}%` }} />
              <i
                style={{
                  position: 'absolute',
                  top: -3,
                  bottom: -3,
                  width: 2,
                  left: `${st.fracao * 100}%`,
                  background: 'var(--ink)',
                }}
              />
            </div>
          </button>
        );
      })}
      {edit && (
        <Sheet open onClose={() => setEdit(null)} title="Teto da categoria">
          <SelectField
            label="Categoria"
            value={edit.categoria}
            onChange={(categoria) => setEdit({ ...edit, categoria })}
            options={CATEGORIAS.saida}
          />
          <MoneyInput label="Teto mensal" value={edit.valor} onChange={(valor) => setEdit({ ...edit, valor })} />
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!edit.valor}
              onClick={async () => {
                await updateSettings((x) => ({ tetos: { ...x.tetos, [edit.categoria]: edit.valor! } }));
                setEdit(null);
              }}
            >
              Salvar
            </button>
            {edit.categoria in s.tetos && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  await updateSettings((x) => {
                    const t = { ...x.tetos };
                    delete t[edit.categoria];
                    return { tetos: t };
                  });
                  setEdit(null);
                }}
              >
                Remover teto
              </button>
            )}
          </div>
        </Sheet>
      )}
    </section>
  );
}
