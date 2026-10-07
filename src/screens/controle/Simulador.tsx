import { useState } from 'react';
import { SelectField } from '../../components/Field';
import { Money } from '../../components/Money';
import { MoneyInput } from '../../components/MoneyInput';
import { useDebts, useSettings } from '../../hooks/useData';
import { efeitoAmortizacao } from '../../lib/finance/dividas';
import { efeito66, trocarCarro } from '../../lib/finance/simulador';
import { saldoPorPapel } from '../../lib/plano/acoes';

type Aba = 'amortizar' | 'carro' | '66';

export function Simulador() {
  const s = useSettings();
  const debts = useDebts();
  const [aba, setAba] = useState<Aba>('amortizar');
  const [dividaId, setDividaId] = useState('');
  const [valor, setValor] = useState<number | null>(null);
  const [compra, setCompra] = useState<number | null>(null);
  if (!s || !debts) return null;
  const ativas = debts.filter((d) => d.ativo && d.saldo > 0);
  const divida = ativas.find((d) => d.id === dividaId) ?? ativas[0];

  return (
    <section className="card stack-sm" aria-labelledby="sm-titulo">
      <h2 id="sm-titulo">Simulador “e se”</h2>
      <div className="row" role="tablist">
        {(
          [
            ['amortizar', 'Amortizar'],
            ['carro', 'Trocar o carro'],
            ['66', '6/6 em 12 meses'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={aba === k}
            className={`btn ${aba === k ? 'btn-primary' : ''}`}
            onClick={() => setAba(k)}
          >
            {l}
          </button>
        ))}
      </div>
      <p className="tiny muted">Simulação: estimativa, não altera seus dados.</p>

      {aba === 'amortizar' &&
        (ativas.length === 0 || !divida ? (
          <p className="small muted">Nenhuma dívida em aberto.</p>
        ) : (
          <>
            <SelectField
              label="Dívida"
              value={divida.id}
              onChange={setDividaId}
              options={ativas.map((d) => ({ value: d.id, label: d.nome }))}
            />
            <MoneyInput label="Valor da amortização" value={valor} onChange={setValor} />
            {valor !== null &&
              valor > 0 &&
              (() => {
                const e = efeitoAmortizacao(divida, valor);
                if (!Number.isFinite(e.mesesAntes)) return <p className="small warn">A parcela atual não cobre os juros.</p>;
                return (
                  <p className="small">
                    Termina em {e.mesesDepois} {e.mesesDepois === 1 ? 'parcela' : 'parcelas'} em vez de {e.mesesAntes}:{' '}
                    <strong>{e.parcelasEvitadas} a menos</strong>. Juros evitados:{' '}
                    <strong>
                      <Money value={e.jurosEvitados} />
                    </strong>
                    .
                  </p>
                );
              })()}
          </>
        ))}

      {aba === 'carro' &&
        (() => {
          const r = trocarCarro({ fipe: s.fipeCarro, saldoCdc: saldoPorPapel(debts, 'cdc'), compraAVista: compra ?? 0 });
          return (
            <>
              <MoneyInput label="Preço do carro novo (à vista)" value={compra} onChange={setCompra} />
              <ul className="list small">
                <li>
                  <span className="grow">Venda (90% da FIPE)</span>
                  <Money value={r.venda} />
                </li>
                <li>
                  <span className="grow">Quitação do CDC</span>
                  <Money value={-r.quitacao} />
                </li>
                <li>
                  <span className="grow">Compra à vista</span>
                  <Money value={-(compra ?? 0)} />
                </li>
                <li>
                  <strong className="grow">{r.saldo >= 0 ? 'Sobra' : 'Falta'}</strong>
                  <strong>
                    <Money value={r.saldo} color />
                  </strong>
                </li>
              </ul>
              {s.fipeCarro === 0 && <p className="tiny warn">Informe a FIPE no Plano.</p>}
            </>
          );
        })()}

      {aba === '66' &&
        (() => {
          const e = efeito66(s.salarioBaseLongevidade);
          return (
            <ul className="list small">
              <li>
                <span className="grow">Custo extra para você em 12 meses</span>
                <Money value={-e.custoParaVoce} />
              </li>
              <li>
                <span className="grow">Capital a mais em 12 meses</span>
                <Money value={e.capitalExtra} />
              </li>
              <li>
                <span className="grow">Cada R$ 1 seu vira</span>
                <strong>R$ 2 de capital</strong>
              </li>
            </ul>
          );
        })()}
    </section>
  );
}
