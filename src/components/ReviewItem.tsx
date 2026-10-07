import { useId, useState } from 'react';
import type { Candidato } from '../lib/capture/candidato';
import { candidatoValido, guardarPorPadrao } from '../lib/capture/candidato';
import { IGNORAVEL_LABEL } from '../lib/capture/categorizar';
import { analisarRecibo } from '../lib/capture/recibo';
import { CATEGORIAS, TIPO_LABEL } from '../lib/db/categories';
import { FORMAS, TIPOS, type Dedutivel, type Tipo } from '../lib/db/schemas';
import { formatDayMonth } from '../lib/dates';
import { formatBRL } from '../lib/money';
import { SelectField, TextField } from './Field';
import { MoneyInput } from './MoneyInput';
import { Thumb } from './Thumb';

type Props = {
  c: Candidato;
  onChange: (patch: Partial<Candidato>) => void;
  onRemove: () => void;
  inicialAberto?: boolean;
};

export function ReviewItem({ c, onChange, onRemove, inicialAberto }: Props) {
  const [aberto, setAberto] = useState(inicialAberto ?? false);
  const [textoOcr, setTextoOcr] = useState(c.textoReconhecido ?? '');
  const id = useId();
  const valido = candidatoValido(c);

  const mudarTipo = (tipo: Tipo) => {
    const categoria = CATEGORIAS[tipo].includes(c.categoria) ? c.categoria : CATEGORIAS[tipo][0]!;
    const dedutivel = tipo === 'saida' ? c.dedutivel : null;
    onChange({ tipo, categoria, dedutivel, guardarFoto: c.guardarFoto || guardarPorPadrao(tipo, dedutivel) });
  };
  const mudarDedutivel = (v: 'nenhum' | 'saude' | 'educacao') => {
    const dedutivel: Dedutivel = v === 'nenhum' ? null : v;
    onChange({ dedutivel, guardarFoto: dedutivel ? true : c.guardarFoto });
  };

  return (
    <article className="card stack-sm" style={{ padding: 12, opacity: c.selecionado ? 1 : 0.75 }} aria-labelledby={`${id}-t`}>
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <label className="check" style={{ minHeight: 'auto', paddingTop: 2 }}>
          <input type="checkbox" checked={c.selecionado} onChange={(e) => onChange({ selecionado: e.target.checked })} />
          <span className="sr-only">Lançar este item</span>
        </label>
        {c.imagem && <Thumb blob={c.imagem} size={48} />}
        <button
          type="button"
          className="grow"
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', minHeight: 44 }}
        >
          <div className="row-between" style={{ flexWrap: 'nowrap' }}>
            <strong id={`${id}-t`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.estabelecimento || c.descricao || 'Sem descrição'}
            </strong>
            <span className={`money ${c.tipo === 'entrada' || c.tipo === 'extra_in' ? 'pos' : ''}`} style={{ flex: 'none' }}>
              {c.valor !== null ? formatBRL(c.valor) : '—'}
            </span>
          </div>
          <div className="small muted">
            {formatDayMonth(c.data)} · {TIPO_LABEL[c.tipo]} · {c.categoria}
          </div>
        </button>
      </div>
      <div className="row" style={{ gap: 4 }}>
        {c.duplicado && <span className="badge badge-warn">Possível duplicado</span>}
        {c.ignoravel && <span className="badge badge-warn">{IGNORAVEL_LABEL[c.ignoravel]}</span>}
        {c.fonteCategoria === 'regra' && <span className="badge badge-accent">Regra aplicada</span>}
        {c.tipo === 'trabalho' && <span className="badge badge-accent">Reembolsável</span>}
        {c.dedutivel && <span className="badge badge-pos">Dedutível</span>}
        {c.cnpj && <span className="badge">CNPJ</span>}
        {!valido && c.selecionado && <span className="badge badge-neg">Falta o valor</span>}
      </div>

      {aberto && (
        <div className="stack-sm">
          <div className="grid-2">
            <MoneyInput label="Valor" value={c.valor} onChange={(v) => onChange({ valor: v })} />
            <TextField label="Data" type="date" value={c.data} onChange={(v) => onChange({ data: v })} />
            <SelectField
              label="Tipo"
              value={c.tipo}
              onChange={mudarTipo}
              options={TIPOS.map((t) => ({ value: t, label: TIPO_LABEL[t] }))}
            />
            <SelectField
              label="Categoria"
              value={c.categoria}
              onChange={(v) => onChange({ categoria: v })}
              options={CATEGORIAS[c.tipo]}
            />
            {c.tipo === 'saida' && (
              <SelectField
                label="Dedutível no IR"
                value={c.dedutivel ?? 'nenhum'}
                onChange={mudarDedutivel}
                options={[
                  { value: 'nenhum', label: 'Não' },
                  { value: 'saude', label: 'Saúde' },
                  { value: 'educacao', label: 'Educação' },
                ]}
              />
            )}
            <SelectField label="Forma" value={c.forma} onChange={(v) => onChange({ forma: v })} options={FORMAS} />
          </div>
          <TextField label="Estabelecimento" value={c.estabelecimento} onChange={(v) => onChange({ estabelecimento: v })} />
          <TextField label="Descrição" value={c.descricao} onChange={(v) => onChange({ descricao: v })} />
          {c.dedutivel && (
            <div className="grid-2">
              <TextField
                label="CNPJ/CPF"
                value={c.cnpj ?? ''}
                inputMode="numeric"
                onChange={(v) => onChange({ cnpj: v || null })}
              />
              <TextField
                label="Beneficiário"
                value={c.beneficiario ?? ''}
                onChange={(v) => onChange({ beneficiario: v || null })}
              />
            </div>
          )}
          {c.imagem && (
            <div className="row" role="radiogroup" aria-label="Foto">
              <button
                type="button"
                className={`btn ${c.guardarFoto ? 'btn-primary' : ''}`}
                aria-pressed={c.guardarFoto}
                onClick={() => onChange({ guardarFoto: true })}
              >
                Guardar foto
              </button>
              <button
                type="button"
                className={`btn ${!c.guardarFoto ? 'btn-primary' : ''}`}
                aria-pressed={!c.guardarFoto}
                disabled={c.dedutivel !== null}
                onClick={() => onChange({ guardarFoto: false })}
              >
                Descartar foto
              </button>
              {c.dedutivel && <span className="tiny muted">Dedutível: a foto é guardada.</span>}
            </div>
          )}
          {c.textoReconhecido !== null && (
            <details>
              <summary>Texto reconhecido</summary>
              <textarea
                className="input"
                aria-label="Texto reconhecido"
                rows={8}
                value={textoOcr}
                onChange={(e) => setTextoOcr(e.target.value)}
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const a = analisarRecibo(textoOcr);
                  onChange({
                    textoReconhecido: textoOcr,
                    valor: a.valor ?? c.valor,
                    data: a.data ?? c.data,
                    cnpj: a.cnpj ?? c.cnpj,
                    estabelecimento: a.estabelecimento ?? c.estabelecimento,
                    forma: a.forma ?? c.forma,
                  });
                }}
              >
                Reler texto corrigido
              </button>
            </details>
          )}
          <button type="button" className="btn btn-ghost btn-danger" onClick={onRemove}>
            Remover da fila
          </button>
        </div>
      )}
    </article>
  );
}
