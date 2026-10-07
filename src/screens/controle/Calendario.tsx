import { useSettings } from '../../hooks/useData';
import { formatDayMonth, todayISO } from '../../lib/dates';
import { proximosEventos, type Evento } from '../../lib/finance/calendario';

const COR: Record<Evento['tipo'], string> = { pagamento: 'badge-neg', plano: 'badge-accent', renda: 'badge-pos', lembrete: '' };
const ROTULO: Record<Evento['tipo'], string> = { pagamento: 'pagar', plano: 'plano', renda: 'renda', lembrete: 'lembrete' };

export function Calendario() {
  const s = useSettings();
  if (!s) return null;
  const hoje = todayISO();
  const ev = proximosEventos(hoje, 45, s.ultimoBackup);
  return (
    <section className="card stack-sm" aria-labelledby="cl-titulo">
      <h2 id="cl-titulo">Próximos 45 dias</h2>
      <ul className="list">
        {ev.map((e, i) => (
          <li key={i}>
            <span className="money" style={{ width: 48, flex: 'none', fontWeight: 600 }}>
              {formatDayMonth(e.data)}
            </span>
            <span className="grow">{e.titulo}</span>
            <span className={`badge ${COR[e.tipo]}`}>{ROTULO[e.tipo]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
