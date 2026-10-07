import { useLiveQuery } from 'dexie-react-hooks';
import { Money } from '../../components/Money';
import { useToast } from '../../components/Toast';
import { useDebts, useSettings } from '../../hooks/useData';
import { db } from '../../lib/db/db';
import { formatDateBR } from '../../lib/dates';
import { sugerirAlocacao, type DestinoExtra } from '../../lib/finance/extraordinarios';
import { pedirLembreteBackup } from '../../lib/lembretes';
import { aplicarAlocacao, saldoPorPapel } from '../../lib/plano/acoes';

const DESTINO_LABEL: Record<DestinoExtra, string> = {
  reserva: 'Reserva',
  consignado: 'Consignado',
  cdc: 'CDC',
  uso_livre: 'Uso livre',
};

/** Assistente de extraordinários: sugere o destino de cada extra_in ainda não alocado. */
export function Assistente() {
  const s = useSettings();
  const debts = useDebts();
  const toast = useToast();
  const pendentes =
    useLiveQuery(
      () =>
        db.transactions
          .where('tipo')
          .equals('extra_in')
          .filter((t) => !t.alocado)
          .sortBy('data'),
      [],
    ) ?? [];
  if (!s || !debts || pendentes.length === 0) return null;

  let reserva = s.reserva;
  let consignado = saldoPorPapel(debts, 'consignado');
  let cdc = saldoPorPapel(debts, 'cdc');

  return (
    <section className="card stack" aria-labelledby="as-titulo" style={{ borderColor: 'var(--accent)' }}>
      <h2 id="as-titulo">Destino dos extraordinários</h2>
      {pendentes.map((t) => {
        const aloc = sugerirAlocacao(t.valor, { reserva, consignado, cdc });
        // Encadeia: o próximo extraordinário considera o efeito deste.
        for (const a of aloc) {
          if (a.destino === 'reserva') reserva += a.valor;
          if (a.destino === 'consignado') consignado -= a.valor;
          if (a.destino === 'cdc') cdc -= a.valor;
        }
        return (
          <div key={t.id} className="stack-sm">
            <div className="row-between">
              <strong>
                {t.categoria} · {formatDateBR(t.data)}
              </strong>
              <Money value={t.valor} />
            </div>
            <ul className="list small">
              {aloc.map((a, i) => (
                <li key={i}>
                  <span className="grow">
                    <strong>{DESTINO_LABEL[a.destino]}</strong>
                    <br />
                    <span className="muted">{a.motivo}</span>
                  </span>
                  <Money value={a.valor} />
                </li>
              ))}
            </ul>
            <div className="row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  await aplicarAlocacao(db, t, aloc);
                  pedirLembreteBackup('Extraordinário aplicado.');
                  toast.show('Destino aplicado');
                }}
              >
                Aplicar sugestão
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  if (!window.confirm('Marcar como resolvido sem mover valores?')) return;
                  await db.transactions.update(t.id, { alocado: true });
                }}
              >
                Já resolvi
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
