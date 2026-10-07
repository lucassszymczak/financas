import { useEffect, useState } from 'react';
import { CATEGORIAS, TIPO_LABEL } from '../lib/db/categories';
import { db } from '../lib/db/db';
import { FORMAS, TIPOS, type Transaction } from '../lib/db/schemas';
import { monthOf } from '../lib/dates';
import { SelectField, TextField } from './Field';
import { MoneyInput } from './MoneyInput';
import { Sheet } from './Sheet';

/** Edição de um lançamento gravado. */
export function TransactionEditor({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  const [t, setT] = useState<Transaction | null>(tx);
  useEffect(() => setT(tx), [tx]);
  return (
    <Sheet open={!!tx} onClose={onClose} title="Editar lançamento">
      {t && (
        <>
          <div className="grid-2">
            <MoneyInput label="Valor" value={t.valor} onChange={(v) => setT({ ...t, valor: v ?? 0 })} />
            <TextField label="Data" type="date" value={t.data} onChange={(v) => setT({ ...t, data: v })} />
            <SelectField
              label="Tipo"
              value={t.tipo}
              onChange={(tipo) =>
                setT({
                  ...t,
                  tipo,
                  categoria: CATEGORIAS[tipo].includes(t.categoria) ? t.categoria : CATEGORIAS[tipo][0]!,
                  dedutivel: tipo === 'saida' ? t.dedutivel : null,
                })
              }
              options={TIPOS.map((x) => ({ value: x, label: TIPO_LABEL[x] }))}
            />
            <SelectField
              label="Categoria"
              value={t.categoria}
              onChange={(categoria) => setT({ ...t, categoria })}
              options={CATEGORIAS[t.tipo]}
            />
            <SelectField label="Forma" value={t.forma} onChange={(forma) => setT({ ...t, forma })} options={FORMAS} />
            {t.tipo === 'saida' && (
              <SelectField
                label="Dedutível no IR"
                value={t.dedutivel ?? 'nenhum'}
                onChange={(v) =>
                  setT({ ...t, dedutivel: v === 'nenhum' ? null : v, comprovantePendente: v !== 'nenhum' && !t.comprovanteId })
                }
                options={[
                  { value: 'nenhum', label: 'Não' },
                  { value: 'saude', label: 'Saúde' },
                  { value: 'educacao', label: 'Educação' },
                ]}
              />
            )}
          </div>
          <TextField label="Estabelecimento" value={t.estabelecimento} onChange={(v) => setT({ ...t, estabelecimento: v })} />
          <TextField label="Descrição" value={t.descricao} onChange={(v) => setT({ ...t, descricao: v })} />
          {t.dedutivel && (
            <div className="grid-2">
              <TextField label="CNPJ/CPF" value={t.cnpj ?? ''} onChange={(v) => setT({ ...t, cnpj: v || null })} />
              <TextField
                label="Beneficiário"
                value={t.beneficiario ?? ''}
                onChange={(v) => setT({ ...t, beneficiario: v || null })}
              />
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={t.valor <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(t.data)}
            onClick={async () => {
              await db.transactions.put({ ...t, mes: monthOf(t.data) });
              onClose();
            }}
          >
            Salvar
          </button>
        </>
      )}
    </Sheet>
  );
}

/** Exclui um lançamento (e o comprovante). Confirma; com mais ênfase se houver comprovante de IR. */
export async function excluirLancamento(t: Transaction): Promise<boolean> {
  const nome = t.estabelecimento || t.descricao || t.categoria;
  const msg =
    t.dedutivel && t.comprovanteId
      ? `"${nome}" tem comprovante de IR guardado. Excluir o lançamento e o comprovante?`
      : `Excluir "${nome}"?`;
  if (!window.confirm(msg)) return false;
  await db.transaction('rw', db.transactions, db.receipts, async () => {
    await db.transactions.delete(t.id);
    if (t.comprovanteId) {
      const outros = await db.transactions.where('comprovanteId').equals(t.comprovanteId).count();
      if (outros === 0) await db.receipts.delete(t.comprovanteId);
    }
  });
  return true;
}
