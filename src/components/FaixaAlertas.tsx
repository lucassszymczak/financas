import type { Alerta } from '../lib/alertas';
import { NOMES_NIVEL } from '../lib/alertas';

export function FaixaAlertas({ alertas }: { alertas: Alerta[] }) {
  if (!alertas.length) return null;
  return (
    <section className="alertas" aria-label="Alertas">
      {alertas.map((a) => (
        <div key={a.chave} className={`alerta alerta-${a.nivel}`} role={a.nivel === 'perigo' ? 'alert' : undefined}>
          <div>
            <span className="alerta-nivel">{NOMES_NIVEL[a.nivel]}</span>
            <strong>
              <span className="sr-only">: </span>
              {a.titulo}
            </strong>
            <p>{a.texto}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
