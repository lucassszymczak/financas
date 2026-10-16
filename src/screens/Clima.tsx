import { useRadar } from '../state';
import { Leitura, Secao, Selo, Vazio } from '../components/Basicos';
import { FaixaAlertas } from '../components/FaixaAlertas';
import { iconeClima, nivelClima, type Alerta } from '../lib/alertas';
import { diaMes, diaSemanaCurto, numero, VAZIO } from '../lib/formato';
import type { RegiaoClima } from '../schema/radar';

/** Ícone aproximado a partir do texto da condição. */
function iconeCondicao(c: string | null | undefined, chuva: number | null | undefined): string {
  const t = (c ?? '').toLowerCase();
  if (/trovo|tempest/.test(t)) return '⛈️';
  if (/chuva|pancada|garoa/.test(t) || (chuva ?? 0) >= 5) return '🌧️';
  if (/nevoeiro|neblina/.test(t)) return '🌫️';
  if (/geada/.test(t)) return '❄️';
  if (/nubl|muitas nuvens/.test(t)) return '☁️';
  if (/nuve/.test(t)) return '⛅';
  if (/sol|seco|claro|aberto/.test(t)) return '☀️';
  return '🌡️';
}

const temp = (v: number | null | undefined) => (v === null || v === undefined ? VAZIO : `${numero(v, 0)}°`);

function alertasDaRegiao(r: RegiaoClima): Alerta[] {
  return r.alertas.map((a, i) => ({
    chave: `${r.id}-${i}`,
    origem: 'clima',
    nivel: nivelClima(a.nivel),
    icone: iconeClima(a.tipo),
    titulo: `${a.tipo.charAt(0).toUpperCase()}${a.tipo.slice(1)}${a.inicio ? ` · ${diaMes(a.inicio)}${a.fim && a.fim !== a.inicio ? ` a ${diaMes(a.fim)}` : ''}` : ''}`,
    texto: a.fonte ? `${a.texto} Fonte: ${a.fonte}.` : a.texto,
  }));
}

export function Clima() {
  const { radar } = useRadar();
  const c = radar.clima;
  if (!c) return <Vazio>Esta edição não trouxe dados de clima.</Vazio>;
  const enso = c.enso;

  return (
    <div className="tela">
      <Leitura titulo="🌾 No campo" texto={c.no_campo} destaque />
      {enso && (
        <section className="cartao enso" aria-label="ENSO">
          <div className="termometro-topo">
            <h2>🌊 ENSO</h2>
            {enso.fase && <Selo tom="info">{enso.fase}</Selo>}
            {enso.intensidade && <Selo>{enso.intensidade}</Selo>}
          </div>
          {enso.texto && <p>{enso.texto}</p>}
          <p className="mudo pequeno">
            {enso.data_ref && <>Ref. {diaMes(enso.data_ref)} · </>}
            {enso.fonte &&
              (enso.url ? (
                <a href={enso.url} target="_blank" rel="noreferrer noopener">
                  {enso.fonte}
                </a>
              ) : (
                enso.fonte
              ))}
          </p>
        </section>
      )}

      {c.regioes.map((r) => (
        <Secao key={r.id} titulo={r.nome} id={`clima-${r.id}`}>
          {r.resumo && <p className="resumo-clima">{r.resumo}</p>}
          <FaixaAlertas alertas={alertasDaRegiao(r)} />
          {r.previsao.length > 0 && (
            <ul className="dias-clima">
              {r.previsao.map((d) => (
                <li key={d.data} className={`dia-clima${d.data === radar.edicao.data ? ' hoje' : ''}`}>
                  <span className="dia-clima-data">
                    <strong>{d.data === radar.edicao.data ? 'Hoje' : diaSemanaCurto(d.data)}</strong>{' '}
                    <span className="mudo">{diaMes(d.data)}</span>
                  </span>
                  <span className="dia-clima-icone" aria-hidden="true">
                    {iconeCondicao(d.condicao, d.chuva_mm)}
                  </span>
                  <span className="dia-clima-temp num">
                    <span className="frio" aria-label="mínima">
                      {temp(d.min)}
                    </span>
                    <span className="mudo"> / </span>
                    <span className="quente" aria-label="máxima">
                      {temp(d.max)}
                    </span>
                  </span>
                  <span className="dia-clima-chuva num">
                    💧 {d.chuva_mm === null || d.chuva_mm === undefined ? VAZIO : `${numero(d.chuva_mm, 0, 1)} mm`}
                    {d.prob_chuva !== null && d.prob_chuva !== undefined && (
                      <span className="mudo"> · {numero(d.prob_chuva, 0)}%</span>
                    )}
                  </span>
                  {d.condicao && <span className="dia-clima-cond">{d.condicao}</span>}
                </li>
              ))}
            </ul>
          )}
          {r.fonte && (
            <p className="mudo pequeno">
              Fonte:{' '}
              {r.url ? (
                <a href={r.url} target="_blank" rel="noreferrer noopener">
                  {r.fonte}
                </a>
              ) : (
                r.fonte
              )}
            </p>
          )}
        </Secao>
      ))}
    </div>
  );
}
