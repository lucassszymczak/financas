import { useState } from 'react';
import { Check, SelectField, TextField } from '../../components/Field';
import { Money } from '../../components/Money';
import { MoneyInput } from '../../components/MoneyInput';
import { Sheet } from '../../components/Sheet';
import { useDebts } from '../../hooks/useData';
import { db } from '../../lib/db/db';
import type { Debt, PapelDivida } from '../../lib/db/schemas';
import { newId } from '../../lib/id';

export const PAPEL_LABEL: Record<PapelDivida, string> = {
  consignado: 'Consignado',
  cdc: 'CDC (carro)',
  acordo: 'Acordo familiar',
  outra: 'Outra',
};

function vazia(ordem: number): Debt {
  return { id: newId(), nome: '', papel: 'outra', saldo: 0, taxaMensal: 0, parcela: 0, ordem, ativo: true };
}

export function DividasEditor() {
  const debts = useDebts() ?? [];
  const [edit, setEdit] = useState<Debt | null>(null);
  const [taxa, setTaxa] = useState('');

  const abrir = (d: Debt) => {
    setEdit(d);
    setTaxa(String(d.taxaMensal).replace('.', ','));
  };
  const taxaNum = Number(taxa.replace(',', '.'));
  const valido = edit && edit.nome.trim() && Number.isFinite(taxaNum) && taxaNum >= 0;

  return (
    <section className="card stack" aria-labelledby="dv-titulo">
      <div className="row-between">
        <h2 id="dv-titulo" style={{ margin: 0 }}>
          Dívidas
        </h2>
        <button type="button" className="btn" onClick={() => abrir(vazia(debts.length))}>
          + Dívida
        </button>
      </div>
      {debts.length === 0 && <p className="muted">Nenhuma dívida cadastrada.</p>}
      <ul className="list">
        {debts.map((d) => (
          <li key={d.id}>
            <div className="grow">
              <strong>{d.nome}</strong> <span className="badge">{PAPEL_LABEL[d.papel]}</span>
              {!d.ativo && <span className="badge">inativa</span>}
              <div className="small muted">
                Saldo <Money value={d.saldo} /> · parcela <Money value={d.parcela} /> · {String(d.taxaMensal).replace('.', ',')}%
                a.m.
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => abrir(d)} aria-label={`Editar ${d.nome}`}>
              Editar
            </button>
          </li>
        ))}
      </ul>

      <Sheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit && debts.some((d) => d.id === edit.id) ? 'Editar dívida' : 'Nova dívida'}
      >
        {edit && (
          <>
            <TextField label="Nome" value={edit.nome} onChange={(v) => setEdit({ ...edit, nome: v })} />
            <SelectField
              label="Papel no plano"
              value={edit.papel}
              onChange={(v) => setEdit({ ...edit, papel: v })}
              options={(Object.keys(PAPEL_LABEL) as PapelDivida[]).map((p) => ({ value: p, label: PAPEL_LABEL[p] }))}
            />
            <div className="grid-2">
              <MoneyInput label="Saldo devedor" value={edit.saldo} onChange={(v) => setEdit({ ...edit, saldo: v ?? 0 })} />
              <MoneyInput label="Parcela" value={edit.parcela} onChange={(v) => setEdit({ ...edit, parcela: v ?? 0 })} />
              <TextField label="Juros ao mês (%)" inputMode="decimal" value={taxa} onChange={setTaxa} hint="0 para sem juros." />
              <TextField
                label="Ordem"
                inputMode="numeric"
                value={String(edit.ordem)}
                onChange={(v) => setEdit({ ...edit, ordem: Number(v.replace(/\D/g, '')) || 0 })}
              />
            </div>
            <Check label="Ativa" checked={edit.ativo} onChange={(v) => setEdit({ ...edit, ativo: v })} />
            <div className="row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!valido}
                onClick={async () => {
                  await db.debts.put({ ...edit, nome: edit.nome.trim(), taxaMensal: taxaNum });
                  setEdit(null);
                }}
              >
                Salvar
              </button>
              {debts.some((d) => d.id === edit.id) && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={async () => {
                    if (!window.confirm(`Excluir a dívida "${edit.nome}"?`)) return;
                    await db.debts.delete(edit.id);
                    setEdit(null);
                  }}
                >
                  Excluir
                </button>
              )}
            </div>
          </>
        )}
      </Sheet>
    </section>
  );
}
