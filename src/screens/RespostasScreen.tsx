import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { MoneyInput } from '../components/MoneyInput';
import { useDebts, useFixedItems, useMonthTransactions, useSettings } from '../hooks/useData';
import { db } from '../lib/db/db';
import { currentMonth, daysInMonth } from '../lib/dates';
import {
  acimaDoRitmo,
  podeGastar,
  previsaoFechamento,
  quantoFalta,
  resultadoMes,
  totaisPorCategoria,
  valeSubir,
  type Resposta,
} from '../lib/finance';
import { resultadosFechados } from '../lib/plano/acoes';

const FUNDO: Record<Resposta['tom'], string> = {
  pos: 'var(--pos-soft)',
  neg: 'var(--neg-soft)',
  warn: 'var(--warn-soft)',
  neutro: 'var(--surface-2)',
};

function RespostaView({ r }: { r: Resposta }) {
  return (
    <div className="stack-sm" aria-live="polite">
      <div style={{ background: FUNDO[r.tom], borderRadius: 10, padding: 12, fontWeight: 600 }}>{r.veredito}</div>
      {r.fatos.length > 0 && (
        <div>
          <span className="badge">Fato</span>
          <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 20 }}>
            {r.fatos.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      {r.estimativas.length > 0 && (
        <div>
          <span className="badge badge-accent">Estimativa</span>
          <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 20 }}>
            {r.estimativas.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Pergunta({ titulo, children, aberta }: { titulo: string; children: ReactNode; aberta?: boolean }) {
  return (
    <details className="card" open={aberta}>
      <summary>
        <h2 style={{ margin: 0, fontSize: '1.02rem' }}>{titulo}</h2>
      </summary>
      <div className="stack-sm" style={{ paddingTop: 8 }}>
        {children}
      </div>
    </details>
  );
}

export function RespostasScreen() {
  const mes = currentMonth();
  const s = useSettings();
  const debts = useDebts();
  const fixos = useFixedItems();
  const txs = useMonthTransactions(mes);
  const fechados = useLiveQuery(() => resultadosFechados(db), []);
  const [valor, setValor] = useState<number | null>(null);
  if (!s || !debts || !fixos || !txs || !fechados) return null;

  const hoje = new Date();
  const dias = daysInMonth(mes);
  const atual = resultadoMes(txs).resultado;
  const prev = previsaoFechamento({ txs, fixos, dia: hoje.getDate(), diasNoMes: dias }).resultadoPrevisto;
  const gastos = new Map(totaisPorCategoria(txs, 'saida').map((c) => [c.categoria, c.total]));

  return (
    <div className="stack">
      <h1>Respostas rápidas</h1>
      <Pergunta titulo="Posso gastar R$ X?" aberta>
        <MoneyInput label="Valor do gasto" value={valor} onChange={setValor} />
        {valor !== null && valor > 0 && <RespostaView r={podeGastar({ valor, resultadoAtual: atual, previsao: prev })} />}
      </Pergunta>
      <Pergunta titulo="Quanto falta para quitar cada dívida?">
        <RespostaView r={quantoFalta(debts, s.ultimoMesAplicado ?? mes)} />
      </Pergunta>
      <Pergunta titulo="Onde estou acima do ritmo?">
        <RespostaView r={acimaDoRitmo({ gastos, tetos: s.tetos, dia: hoje.getDate(), diasNoMes: dias })} />
      </Pergunta>
      <Pergunta titulo="Vale subir o Longevidade na próxima janela?">
        <RespostaView
          r={valeSubir({
            modo: s.longevidadeModo,
            mesAtual: mes,
            previsao: prev,
            mediaFechados: fechados.media,
            salarioBase: s.salarioBaseLongevidade,
          })}
        />
      </Pergunta>
    </div>
  );
}
