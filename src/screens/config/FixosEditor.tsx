import { useState } from 'react';
import { Check, SelectField, TextField } from '../../components/Field';
import { Money } from '../../components/Money';
import { MoneyInput } from '../../components/MoneyInput';
import { Sheet } from '../../components/Sheet';
import { useFixedItems } from '../../hooks/useData';
import { CATEGORIAS } from '../../lib/db/categories';
import { db } from '../../lib/db/db';
import type { FixedItem } from '../../lib/db/schemas';
import { newId } from '../../lib/id';

function vazio(): FixedItem {
  return { id: newId(), tipo: 'saida', categoria: 'Moradia', descricao: '', valor: 0, ativo: true };
}

export function FixosEditor({ titulo = 'Fixos' }: { titulo?: string }) {
  const fixos = useFixedItems() ?? [];
  const [edit, setEdit] = useState<FixedItem | null>(null);
  const existe = edit && fixos.some((f) => f.id === edit.id);
  const ordenados = [...fixos].sort((a, b) => (a.tipo === b.tipo ? b.valor - a.valor : a.tipo === 'entrada' ? -1 : 1));

  return (
    <section className="card stack" aria-labelledby="fx-titulo">
      <div className="row-between">
        <h2 id="fx-titulo" style={{ margin: 0 }}>
          {titulo}
        </h2>
        <button type="button" className="btn" onClick={() => setEdit(vazio())}>
          + Fixo
        </button>
      </div>
      {fixos.length === 0 && <p className="muted">Nenhum fixo cadastrado.</p>}
      <ul className="list">
        {ordenados.map((f) => (
          <li key={f.id}>
            <div className="grow">
              <strong>{f.descricao || f.categoria}</strong>
              {!f.ativo && <span className="badge"> inativo</span>}
              <div className="small muted">
                {f.tipo === 'entrada' ? 'Entrada' : 'Saída'} · {f.categoria}
              </div>
            </div>
            <Money value={f.tipo === 'entrada' ? f.valor : -f.valor} signed color />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEdit(f)}
              aria-label={`Editar ${f.descricao || f.categoria}`}
            >
              Editar
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={existe ? 'Editar fixo' : 'Novo fixo'}>
        {edit && (
          <>
            <SelectField
              label="Tipo"
              value={edit.tipo}
              onChange={(v) => setEdit({ ...edit, tipo: v, categoria: CATEGORIAS[v][0]! })}
              options={[
                { value: 'saida', label: 'Saída' },
                { value: 'entrada', label: 'Entrada' },
              ]}
            />
            <SelectField
              label="Categoria"
              value={edit.categoria}
              onChange={(v) => setEdit({ ...edit, categoria: v })}
              options={CATEGORIAS[edit.tipo]}
            />
            <TextField label="Descrição" value={edit.descricao} onChange={(v) => setEdit({ ...edit, descricao: v })} />
            <MoneyInput label="Valor" value={edit.valor} onChange={(v) => setEdit({ ...edit, valor: v ?? 0 })} />
            <Check label="Ativo" checked={edit.ativo} onChange={(v) => setEdit({ ...edit, ativo: v })} />
            <div className="row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={edit.valor <= 0}
                onClick={async () => {
                  await db.fixedItems.put({ ...edit, descricao: edit.descricao.trim() });
                  setEdit(null);
                }}
              >
                Salvar
              </button>
              {existe && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={async () => {
                    if (!window.confirm('Excluir este fixo?')) return;
                    await db.fixedItems.delete(edit.id);
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
