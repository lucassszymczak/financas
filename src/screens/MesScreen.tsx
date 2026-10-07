import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { Regua } from '../components/Regua';
import { excluirLancamento, TransactionEditor } from '../components/TransactionEditor';
import { useToast } from '../components/Toast';
import { useFixedItems, useMonthTransactions, useSettings } from '../hooks/useData';
import { TIPO_LABEL_CURTO } from '../lib/db/categories';
import { db } from '../lib/db/db';
import { TIPOS, type Transaction } from '../lib/db/schemas';
import { addMonths, currentMonth, daysInMonth, diffDays, formatDateBR, formatDayMonth, monthTitle, todayISO } from '../lib/dates';
import { previsaoFechamento, resultadoMes, statusTeto, totaisPorCategoria, vereditoLongevidade } from '../lib/finance';
import { formatBRL, formatBRLSigned } from '../lib/money';

function Reembolsos() {
  const pendentes =
    useLiveQuery(
      () =>
        db.transactions
          .where('tipo')
          .equals('trabalho')
          .filter((t) => !t.reembolsado)
          .sortBy('data'),
      [],
    ) ?? [];
  const toast = useToast();
  if (pendentes.length === 0) return null;
  const hoje = todayISO();
  const total = pendentes.reduce((a, t) => a + t.valor, 0);
  return (
    <section className="card stack-sm" aria-labelledby="rb-titulo">
      <div className="row-between">
        <h2 id="rb-titulo" style={{ margin: 0 }}>
          Reembolsos pendentes
        </h2>
        <Money value={total} />
      </div>
      <ul className="list">
        {pendentes.map((t) => {
          const dias = diffDays(t.data, hoje);
          return (
            <li key={t.id}>
              <div className="grow">
                <strong>{t.estabelecimento || t.descricao || t.categoria}</strong>
                <div className={`small ${dias > 20 ? 'neg' : 'muted'}`}>
                  {formatDateBR(t.data)} · {dias} {dias === 1 ? 'dia' : 'dias'} em aberto{dias > 20 ? ' — cobrar' : ''}
                </div>
              </div>
              <Money value={t.valor} />
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  await db.transactions.update(t.id, { reembolsado: true, reembolsadoEm: hoje });
                  toast.show('Reembolso recebido');
                }}
              >
                Recebido
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MesScreen() {
  const [mes, setMes] = useState(currentMonth());
  const [editando, setEditando] = useState<Transaction | null>(null);
  const txs = useMonthTransactions(mes);
  const fixos = useFixedItems();
  const s = useSettings();
  const ehAtual = mes === currentMonth();

  const dados = useMemo(() => {
    if (!txs) return null;
    const r = resultadoMes(txs);
    const hoje = new Date();
    const prev = ehAtual && fixos ? previsaoFechamento({ txs, fixos, dia: hoje.getDate(), diasNoMes: daysInMonth(mes) }) : null;
    const porCat = totaisPorCategoria(txs, 'saida');
    return { r, prev, porCat };
  }, [txs, fixos, ehAtual, mes]);

  if (!dados || !s) return null;
  const { r, prev, porCat } = dados;
  const valorRegra = prev ? prev.resultadoPrevisto : r.resultado;
  const veredito = vereditoLongevidade({ valor: valorRegra, estimativa: !!prev, modo: s.longevidadeModo, mes });
  const maxCat = Math.max(1, ...porCat.map((c) => Math.max(c.total, s.tetos[c.categoria] ?? 0)));
  const dia = ehAtual ? new Date().getDate() : daysInMonth(mes);

  return (
    <div className="stack">
      <div className="month-nav">
        <button type="button" className="btn btn-ghost" aria-label="Mês anterior" onClick={() => setMes(addMonths(mes, -1))}>
          <Icon name="chevronLeft" />
        </button>
        <h1>{monthTitle(mes)}</h1>
        <button
          type="button"
          className="btn btn-ghost"
          aria-label="Próximo mês"
          disabled={ehAtual}
          onClick={() => setMes(addMonths(mes, 1))}
        >
          <Icon name="chevronRight" />
        </button>
      </div>

      <section className="card stack-sm" aria-label="Resultado do mês">
        <span className="small muted">Resultado {ehAtual ? 'até hoje' : 'do mês'}</span>
        <span className={`big-number ${r.resultado >= 0 ? 'pos' : 'neg'}`}>{formatBRLSigned(r.resultado)}</span>
        <span className="small muted">
          Entradas <Money value={r.entradas} /> · Saídas <Money value={r.saidas} />
        </span>
        <Regua valor={r.resultado} previsao={prev?.resultadoPrevisto ?? null} />
        {prev && (
          <div className="row-between">
            <span>
              <span className="tag-estimativa">Estimativa</span>
              <br />
              <span className="small muted">Previsão de fechamento</span>
            </span>
            <span
              className={`money ${prev.resultadoPrevisto >= 0 ? 'pos' : 'neg'}`}
              style={{ fontSize: '1.2rem', fontWeight: 600 }}
            >
              {formatBRLSigned(prev.resultadoPrevisto)}
            </span>
          </div>
        )}
        <div
          className={`card ${veredito.tom}`}
          style={{
            background:
              veredito.tom === 'pos' ? 'var(--pos-soft)' : veredito.tom === 'neg' ? 'var(--neg-soft)' : 'var(--surface-2)',
            border: 0,
            padding: 12,
            boxShadow: 'none',
          }}
        >
          <strong>{veredito.titulo}</strong>
          <div className="small" style={{ color: 'var(--ink)' }}>
            {veredito.detalhe}
          </div>
        </div>
      </section>

      <Reembolsos />

      {porCat.length > 0 && (
        <section className="card stack-sm" aria-labelledby="cat-titulo">
          <h2 id="cat-titulo">Saídas por categoria</h2>
          {porCat.map((c) => {
            const teto = s.tetos[c.categoria];
            const st = teto ? statusTeto(c.total, teto, dia, daysInMonth(mes)) : null;
            const cls = st ? (st.nivel === 'vermelho' ? 'neg' : st.nivel === 'amarelo' || st.acimaDoRitmo ? 'warn' : 'pos') : '';
            return (
              <div key={c.categoria} className="cat-bar">
                <div className="row-between small">
                  <span>{c.categoria}</span>
                  <span>
                    <Money value={c.total} />
                    {teto ? <span className="muted"> / {formatBRL(teto, { semCentavos: true })}</span> : null}
                  </span>
                </div>
                <div className={`bar ${cls}`} aria-hidden="true">
                  <span style={{ width: `${(c.total / maxCat) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="stack-sm" aria-label="Lançamentos">
        {txs!.length === 0 && <p className="muted center">Nenhum lançamento neste mês.</p>}
        {TIPOS.map((tipo) => {
          const itens = txs!.filter((t) => t.tipo === tipo).sort((a, b) => (a.data < b.data ? 1 : -1));
          if (itens.length === 0) return null;
          const total = itens.reduce((a, t) => a + t.valor, 0);
          return (
            <details key={tipo} className="card" open={tipo === 'saida' || tipo === 'entrada'}>
              <summary>
                <span className="grow">
                  {TIPO_LABEL_CURTO[tipo]} ({itens.length})
                </span>
                <Money value={total} />
              </summary>
              <ul className="list">
                {itens.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="grow"
                      style={{
                        background: 'none',
                        border: 0,
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                        minHeight: 44,
                        minWidth: 0,
                      }}
                      onClick={() => setEditando(t)}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.estabelecimento || t.descricao || t.categoria}
                      </div>
                      <div className="small muted">
                        {formatDayMonth(t.data)} · {t.categoria}
                        {t.dedutivel ? ' · IR' : ''}
                        {t.tipo === 'trabalho' && t.reembolsado ? ' · reembolsado' : ''}
                      </div>
                    </button>
                    <Money value={t.valor} />
                    <button
                      type="button"
                      className="btn btn-ghost btn-danger"
                      aria-label={`Excluir ${t.estabelecimento || t.descricao || t.categoria}`}
                      onClick={() => excluirLancamento(t)}
                    >
                      <Icon name="trash" />
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </section>
      <TransactionEditor tx={editando} onClose={() => setEditando(null)} />
    </div>
  );
}
