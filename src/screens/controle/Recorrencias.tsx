import { useLiveQuery } from 'dexie-react-hooks';
import { Money } from '../../components/Money';
import { db } from '../../lib/db/db';
import { addMonths, currentMonth } from '../../lib/dates';
import { detectarRecorrencias } from '../../lib/finance/recorrencias';

export function Recorrencias() {
  const desde = addMonths(currentMonth(), -5);
  const recs = useLiveQuery(
    async () => detectarRecorrencias(await db.transactions.where('mes').aboveOrEqual(desde).toArray()),
    [desde],
  );
  if (!recs) return null;
  const total = recs.reduce((a, r) => a + r.custoAnual, 0);
  return (
    <section className="card stack-sm" aria-labelledby="rc-titulo">
      <div className="row-between">
        <h2 id="rc-titulo" style={{ margin: 0 }}>
          Recorrências
        </h2>
        {recs.length > 0 && (
          <span className="small">
            <Money value={total} semCentavos /> /ano
          </span>
        )}
      </div>
      <p className="tiny muted">Gastos não fixos que se repetem com valor parecido (últimos 6 meses).</p>
      {recs.length === 0 && <p className="small muted">Nenhuma encontrada.</p>}
      <ul className="list">
        {recs.map((r) => (
          <li key={r.chave}>
            <div className="grow">
              <strong>{r.nome}</strong>
              <div className="small muted">
                {r.categoria} · {r.meses.length} meses · média <Money value={r.media} />
              </div>
            </div>
            <span className="small">
              <Money value={r.custoAnual} semCentavos />
              /ano
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
