import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { SelectField } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { useSettings } from '../../hooks/useData';
import { db } from '../../lib/db/db';
import { addMonths, currentMonth, monthLabel } from '../../lib/dates';
import { gerarFechamento } from '../../lib/finance/fechamento';
import { pedirLembreteBackup } from '../../lib/lembretes';

export function Fechamento() {
  const s = useSettings();
  const toast = useToast();
  const opcoes = Array.from({ length: 12 }, (_, i) => addMonths(currentMonth(), -i));
  const [mes, setMes] = useState(addMonths(currentMonth(), -1));
  const salvo = useLiveQuery(() => db.closings.get(mes), [mes]);
  const fechados = useLiveQuery(() => db.closings.orderBy('mes').reverse().toArray(), []) ?? [];
  const [texto, setTexto] = useState('');

  useEffect(() => setTexto(salvo?.texto ?? ''), [salvo]);

  if (!s) return null;
  const gerar = async () => {
    const [txs, txsAnterior] = await Promise.all([
      db.transactions.where('mes').equals(mes).toArray(),
      db.transactions.where('mes').equals(addMonths(mes, -1)).toArray(),
    ]);
    setTexto(gerarFechamento({ mes, txs, txsAnterior, tetos: s.tetos, modo: s.longevidadeModo }));
  };

  return (
    <section className="card stack-sm" aria-labelledby="fc-titulo">
      <h2 id="fc-titulo">Fechamento do mês</h2>
      <SelectField
        label="Mês"
        value={mes}
        onChange={setMes}
        options={opcoes.map((m) => ({ value: m, label: `${monthLabel(m)}${fechados.some((f) => f.mes === m) ? ' ✓' : ''}` }))}
      />
      {mes === currentMonth() && <p className="tiny warn">O mês ainda não terminou: o fechamento será parcial.</p>}
      <button type="button" className="btn" onClick={gerar}>
        {salvo ? 'Gerar de novo' : 'Gerar fechamento'}
      </button>
      {texto && (
        <>
          <textarea
            className="input"
            aria-label="Texto do fechamento"
            rows={12}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              await db.closings.put({ mes, texto, criadoEm: new Date().toISOString() });
              pedirLembreteBackup('Mês fechado.');
              toast.show('Fechamento salvo');
            }}
          >
            Salvar fechamento
          </button>
        </>
      )}
      {salvo && (
        <p className="tiny muted">
          Salvo em {new Date(salvo.criadoEm).toLocaleDateString('pt-BR')}. Meses fechados entram na média da projeção.
        </p>
      )}
    </section>
  );
}
