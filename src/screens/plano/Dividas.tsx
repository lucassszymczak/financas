import { useState } from 'react';
import { Money } from '../../components/Money';
import { useToast } from '../../components/Toast';
import { useDebts, useSettings } from '../../hooks/useData';
import { db } from '../../lib/db/db';
import type { Debt } from '../../lib/db/schemas';
import { currentMonth, monthLabel } from '../../lib/dates';
import { mesesRestantes, mesTermino, proximoMesAplicavel } from '../../lib/finance/dividas';
import { amortizarDivida, aplicarParcelas, corrigirSaldo } from '../../lib/plano/acoes';
import { PAPEL_LABEL } from '../config/DividasEditor';
import { ValorSheet } from './ValorSheet';

export function Dividas() {
  const debts = useDebts();
  const s = useSettings();
  const toast = useToast();
  const [acao, setAcao] = useState<{ tipo: 'amortizar' | 'corrigir'; d: Debt } | null>(null);
  if (!debts || !s) return null;
  const ativas = debts.filter((d) => d.ativo);
  const base = s.ultimoMesAplicado ?? currentMonth();
  const proximo = proximoMesAplicavel(s.ultimoMesAplicado, currentMonth());

  return (
    <section className="card stack-sm" aria-labelledby="dvp-titulo">
      <h2 id="dvp-titulo">Dívidas</h2>
      {ativas.length === 0 && <p className="muted small">Cadastre as dívidas em Ajustes.</p>}
      {ativas.map((d) => {
        const n = mesesRestantes(d);
        const fim = mesTermino(d, base);
        const juros = Math.round((d.saldo * d.taxaMensal) / 100);
        return (
          <article key={d.id} className="stack-sm" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
            <div className="row-between">
              <strong>
                {d.nome} <span className="badge">{PAPEL_LABEL[d.papel]}</span>
              </strong>
              <Money value={d.saldo} />
            </div>
            <div className="small muted">
              Parcela <Money value={d.parcela} /> · {String(d.taxaMensal).replace('.', ',')}% a.m.
              {d.taxaMensal > 0 && (
                <>
                  {' '}
                  · juros do mês <Money value={juros} />
                </>
              )}
            </div>
            <div className="small">
              {d.saldo === 0
                ? 'Quitada.'
                : Number.isFinite(n)
                  ? `Término previsto: ${monthLabel(fim!)} (${n} ${n === 1 ? 'parcela' : 'parcelas'}).`
                  : 'A parcela não cobre os juros.'}
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => setAcao({ tipo: 'amortizar', d })}>
                Amortizar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setAcao({ tipo: 'corrigir', d })}>
                Corrigir saldo
              </button>
            </div>
          </article>
        );
      })}
      <button
        type="button"
        className="btn btn-primary"
        disabled={!proximo}
        onClick={async () => {
          const mes = await aplicarParcelas(db);
          if (mes) toast.show(`Parcelas de ${monthLabel(mes)} aplicadas`);
        }}
      >
        {proximo ? `Aplicar parcelas de ${monthLabel(proximo)}` : 'Parcelas em dia'}
      </button>
      <span className="tiny muted">
        Último mês aplicado: {s.ultimoMesAplicado ? monthLabel(s.ultimoMesAplicado) : 'nenhum'} · juros pagos{' '}
        <Money value={s.jurosPagos} />
      </span>
      {acao && (
        <ValorSheet
          titulo={`${acao.tipo === 'amortizar' ? 'Amortizar' : 'Corrigir saldo de'} ${acao.d.nome}`}
          rotulo={acao.tipo === 'amortizar' ? 'Valor da amortização' : 'Saldo devedor atual'}
          botao={acao.tipo === 'amortizar' ? 'Amortizar' : 'Salvar saldo'}
          inicial={acao.tipo === 'corrigir' ? acao.d.saldo : null}
          onClose={() => setAcao(null)}
          onConfirm={async (v) => {
            if (acao.tipo === 'amortizar') await amortizarDivida(db, acao.d.id, v);
            else await corrigirSaldo(db, acao.d.id, v);
          }}
        />
      )}
    </section>
  );
}
