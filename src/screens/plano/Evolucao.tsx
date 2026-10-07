import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db/db';
import { monthShort } from '../../lib/dates';
import { formatCompacto } from '../../lib/money';

export function Evolucao() {
  const snaps = useLiveQuery(() => db.snapshots.orderBy('mes').reverse().limit(24).toArray(), []) ?? [];
  if (snaps.length === 0) return null;
  return (
    <section className="card stack-sm" aria-labelledby="ev-titulo">
      <h2 id="ev-titulo">Evolução</h2>
      <div className="table-wrap">
        <table className="table money">
          <thead>
            <tr>
              <th>Mês</th>
              <th>Reserva</th>
              <th>Capital</th>
              <th>Dívidas</th>
              <th>Juros</th>
            </tr>
          </thead>
          <tbody>
            {snaps.map((s) => (
              <tr key={s.mes}>
                <td>{monthShort(s.mes)}</td>
                <td>{formatCompacto(s.reserva)}</td>
                <td>{formatCompacto(s.capital)}</td>
                <td>{formatCompacto(s.dividas.reduce((a, d) => a + d.saldo, 0))}</td>
                <td>{formatCompacto(s.jurosDoMes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
