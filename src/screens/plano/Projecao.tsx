import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { SelectField } from '../../components/Field';
import { MoneyInput } from '../../components/MoneyInput';
import { useToast } from '../../components/Toast';
import { useDebts, useSettings } from '../../hooks/useData';
import { db } from '../../lib/db/db';
import type { Projecao as P } from '../../lib/db/schemas';
import { updateSettings } from '../../lib/db/settings';
import { addMonths, currentMonth, monthLabel, monthShort } from '../../lib/dates';
import { proximaJanela } from '../../lib/finance/longevidade';
import { simular12Meses } from '../../lib/finance/simulacao';
import { formatBRL, formatBRLSigned, formatCompacto } from '../../lib/money';
import { resultadosFechados } from '../../lib/plano/acoes';

export function Projecao() {
  const s = useSettings();
  const debts = useDebts();
  const toast = useToast();
  const fechados = useLiveQuery(() => resultadosFechados(db), []);
  const [p, setP] = useState<P | null>(null);
  useEffect(() => {
    if (s) setP(s.projecao);
  }, [s]);

  const inicio = s?.ultimoMesAplicado ?? addMonths(currentMonth(), -1);
  const sim = useMemo(() => {
    if (!s || !debts || !p || !fechados) return null;
    return simular12Meses({
      ultimoMesAplicado: inicio,
      reserva: s.reserva,
      capital: s.capital,
      longevidadeModo: s.longevidadeModo,
      salarioBase: s.salarioBaseLongevidade,
      dividas: debts,
      projecao: p,
      mediaFechados: fechados.media,
    });
  }, [s, debts, p, fechados, inicio]);

  if (!s || !p || !sim) return null;
  const j1 = proximaJanela(addMonths(inicio, 1));
  const j2 = proximaJanela(addMonths(j1, 1));
  const origem = {
    manual: 'valor manual',
    media: `média de ${fechados!.meses.length} ${fechados!.meses.length === 1 ? 'mês fechado' : 'meses fechados'}`,
    padrao: 'padrão, sem meses fechados',
  }[sim.origemFluxo];

  return (
    <section className="card stack-sm" aria-labelledby="pj-titulo">
      <h2 id="pj-titulo">Projeção de 12 meses</h2>
      <p className="small">
        <span className="tag-estimativa">Estimativa</span> · fluxo mensal {formatBRLSigned(sim.fluxoBase)} ({origem}).
      </p>
      <details>
        <summary>Premissas</summary>
        <div className="grid-2">
          <MoneyInput
            label="Fluxo mensal manual"
            allowNegative
            value={p.resultadoManual}
            onChange={(v) => setP({ ...p, resultadoManual: v })}
            placeholder="vazio = média"
          />
          <MoneyInput label="Piso da reserva" value={p.pisoReserva} onChange={(v) => setP({ ...p, pisoReserva: v ?? 0 })} />
          <MoneyInput label="13º em novembro" value={p.decimoNov} onChange={(v) => setP({ ...p, decimoNov: v ?? 0 })} />
          <MoneyInput label="13º em dezembro" value={p.decimoDez} onChange={(v) => setP({ ...p, decimoDez: v ?? 0 })} />
          <MoneyInput label="PLR em março" value={p.plrMarco} onChange={(v) => setP({ ...p, plrMarco: v ?? 0 })} />
          <MoneyInput
            label="Restituição em junho"
            value={p.restituicaoJunho}
            onChange={(v) => setP({ ...p, restituicaoJunho: v ?? 0 })}
          />
          <SelectField
            label="Subir para 6/6 em"
            value={p.janelaLongevidade ?? ''}
            onChange={(v) => setP({ ...p, janelaLongevidade: v || null })}
            options={[
              { value: '', label: s.longevidadeModo === '6/6' ? 'Já está em 6/6' : 'Não subir' },
              { value: j1, label: monthLabel(j1) },
              { value: j2, label: monthLabel(j2) },
            ]}
          />
        </div>
        <button
          type="button"
          className="btn"
          style={{ marginTop: 8 }}
          onClick={async () => {
            await updateSettings({ projecao: p });
            toast.show('Premissas salvas');
          }}
        >
          Salvar premissas
        </button>
      </details>
      <div className="table-wrap">
        <table className="table money">
          <thead>
            <tr>
              <th>Mês</th>
              <th>Fluxo</th>
              <th>Reserva</th>
              <th>Consig.</th>
              <th>Capital</th>
            </tr>
          </thead>
          <tbody>
            {sim.linhas.map((l) => (
              <tr key={l.mes}>
                <td>
                  {monthShort(l.mes)}
                  {l.extraordinario > 0 ? ' ★' : ''}
                </td>
                <td className={l.fluxo < 0 ? 'neg' : 'pos'}>{formatCompacto(l.fluxo)}</td>
                <td className={l.reserva < p.pisoReserva ? 'warn' : ''}>{formatCompacto(l.reserva)}</td>
                <td>{formatCompacto(l.consignado)}</td>
                <td>{formatCompacto(l.capital)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny muted">Valores em reais. ★ mês com extraordinário.</p>
      <p className="small">
        {sim.mesQuitacaoConsignado
          ? `Consignado quitado em ${monthLabel(sim.mesQuitacaoConsignado)}.`
          : 'Consignado não quita nestes 12 meses.'}
      </p>
      {sim.alertaReservaAbaixoPiso && (
        <p className="small warn" role="alert">
          Atenção: a reserva termina abaixo do piso ({formatBRL(p.pisoReserva, { semCentavos: true })}).
        </p>
      )}
    </section>
  );
}
