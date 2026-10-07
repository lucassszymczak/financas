import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { SelectField, TextField } from '../../components/Field';
import { CATEGORIAS, TIPO_LABEL } from '../../lib/db/categories';
import { db } from '../../lib/db/db';
import { TIPOS, type Dedutivel, type Tipo } from '../../lib/db/schemas';
import { newId } from '../../lib/id';

export function DicionarioEditor() {
  const kws = useLiveQuery(() => db.keywordDictionary.orderBy('palavra').toArray(), []) ?? [];
  const regras = useLiveQuery(() => db.categoryRules.orderBy('atualizadoEm').reverse().toArray(), []) ?? [];
  const [palavra, setPalavra] = useState('');
  const [tipo, setTipo] = useState<Tipo>('saida');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS.saida[0]!);
  const [dedutivel, setDedutivel] = useState<'nenhum' | 'saude' | 'educacao'>('nenhum');

  return (
    <section className="card stack" aria-labelledby="dc-titulo">
      <h2 id="dc-titulo">Dicionário de categorias</h2>
      <p className="small muted">Palavra encontrada na descrição → categoria sugerida. Regras aprendidas têm prioridade.</p>
      <details>
        <summary>Adicionar palavra</summary>
        <div className="stack-sm">
          <TextField label="Palavra (ou início dela)" value={palavra} onChange={setPalavra} />
          <SelectField
            label="Tipo"
            value={tipo}
            onChange={(v) => {
              setTipo(v);
              setCategoria(CATEGORIAS[v][0]!);
            }}
            options={TIPOS.map((t) => ({ value: t, label: TIPO_LABEL[t] }))}
          />
          <SelectField label="Categoria" value={categoria} onChange={setCategoria} options={CATEGORIAS[tipo]} />
          <SelectField
            label="Dedutível"
            value={dedutivel}
            onChange={setDedutivel}
            options={[
              { value: 'nenhum', label: 'Não' },
              { value: 'saude', label: 'Saúde' },
              { value: 'educacao', label: 'Educação' },
            ]}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!palavra.trim()}
            onClick={async () => {
              const d: Dedutivel = dedutivel === 'nenhum' ? null : dedutivel;
              await db.keywordDictionary.add({
                id: newId(),
                palavra: palavra.trim().toLowerCase(),
                tipo,
                categoria,
                dedutivel: d,
              });
              setPalavra('');
            }}
          >
            Adicionar
          </button>
        </div>
      </details>
      <details>
        <summary>Palavras ({kws.length})</summary>
        <ul className="list">
          {kws.map((k) => (
            <li key={k.id}>
              <div className="grow">
                <strong>{k.palavra}</strong>
                <div className="small muted">
                  {TIPO_LABEL[k.tipo]} · {k.categoria}
                  {k.dedutivel ? ` · dedutível (${k.dedutivel === 'saude' ? 'saúde' : 'educação'})` : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-danger"
                aria-label={`Remover ${k.palavra}`}
                onClick={() => db.keywordDictionary.delete(k.id)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary>Regras aprendidas ({regras.length})</summary>
        {regras.length === 0 && <p className="small muted">Surgem quando você corrige a categoria na revisão.</p>}
        <ul className="list">
          {regras.map((r) => (
            <li key={r.chave}>
              <div className="grow">
                <strong>{r.chave}</strong>
                <div className="small muted">
                  {TIPO_LABEL[r.tipo]} · {r.categoria}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-danger"
                aria-label={`Remover regra ${r.chave}`}
                onClick={() => db.categoryRules.delete(r.chave)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
