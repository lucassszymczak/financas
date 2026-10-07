import { useMemo, useState } from 'react';
import { Check, SelectField, TextField } from '../../components/Field';
import { Sheet } from '../../components/Sheet';
import { aplicarMapeamento, parseCSV, type Deteccao, type Separador } from '../../lib/capture/csv';
import { formatDateBR } from '../../lib/dates';
import { formatBRLSigned } from '../../lib/money';
import type { CsvPendente } from './useProcessarArquivos';

const PADRAO: Deteccao = {
  separador: ';',
  temCabecalho: true,
  colData: 0,
  colDescricao: 1,
  colValor: 2,
  formatoData: 'dd/mm/aaaa',
  formatoValor: 'br',
  positivoEhSaida: false,
};

/** Mapeamento manual de colunas de CSV (quando a detecção falha ou para ajustar). */
export function CsvMapeamentoSheet({
  pend,
  onConfirm,
  onClose,
}: {
  pend: CsvPendente;
  onConfirm: (m: Deteccao, banco: string) => void;
  onClose: () => void;
}) {
  const [m, setM] = useState<Deteccao>(pend.deteccao ?? PADRAO);
  const [banco, setBanco] = useState('');
  const rows = useMemo(() => {
    if (pend.deteccao && pend.deteccao.separador === m.separador) return pend.rows;
    // Remonta o texto para trocar o separador.
    const texto = pend.rows.map((r) => r.join(pend.deteccao?.separador ?? ';')).join('\n');
    return parseCSV(texto, m.separador);
  }, [pend, m.separador]);
  const ncols = Math.max(0, ...rows.slice(0, 20).map((r) => r.length));
  const cabecalho = rows[0] ?? [];
  const exemplo = rows[m.temCabecalho ? 1 : 0] ?? [];
  const colunas = [...Array(ncols).keys()].map((i) => ({
    value: String(i),
    label: `${i + 1}: ${m.temCabecalho ? cabecalho[i] || '—' : ''} ${exemplo[i] ? `(${exemplo[i]!.slice(0, 24)})` : ''}`.trim(),
  }));
  const preview = aplicarMapeamento(rows, m).slice(0, 4);

  return (
    <Sheet open onClose={onClose} title="Colunas do CSV">
      <p className="small muted">{pend.nome}: indique as colunas de data, descrição e valor.</p>
      <div className="grid-2">
        <SelectField<Separador>
          label="Separador"
          value={m.separador}
          onChange={(v) => setM({ ...m, separador: v })}
          options={[
            { value: ';', label: 'Ponto e vírgula (;)' },
            { value: ',', label: 'Vírgula (,)' },
            { value: '\t', label: 'Tabulação' },
          ]}
        />
        <SelectField
          label="Data"
          value={String(m.colData)}
          onChange={(v) => setM({ ...m, colData: Number(v) })}
          options={colunas}
        />
        <SelectField
          label="Descrição"
          value={String(m.colDescricao)}
          onChange={(v) => setM({ ...m, colDescricao: Number(v) })}
          options={colunas}
        />
        <SelectField
          label="Valor"
          value={String(m.colValor)}
          onChange={(v) => setM({ ...m, colValor: Number(v) })}
          options={colunas}
        />
        <SelectField
          label="Formato da data"
          value={m.formatoData}
          onChange={(v) => setM({ ...m, formatoData: v })}
          options={[
            { value: 'dd/mm/aaaa', label: 'dd/mm/aaaa' },
            { value: 'aaaa-mm-dd', label: 'aaaa-mm-dd' },
          ]}
        />
        <SelectField
          label="Formato do valor"
          value={m.formatoValor}
          onChange={(v) => setM({ ...m, formatoValor: v })}
          options={[
            { value: 'br', label: '1.234,56' },
            { value: 'us', label: '1,234.56' },
          ]}
        />
      </div>
      <Check label="Primeira linha é cabeçalho" checked={m.temCabecalho} onChange={(v) => setM({ ...m, temCabecalho: v })} />
      <Check
        label="Valores positivos são gastos (fatura de cartão)"
        checked={m.positivoEhSaida}
        onChange={(v) => setM({ ...m, positivoEhSaida: v })}
      />
      <div className="card" style={{ background: 'var(--surface-2)', padding: 12 }}>
        <strong className="small">Prévia</strong>
        {preview.length === 0 && <p className="small neg">Nenhuma linha válida com estas colunas.</p>}
        <ul className="list small">
          {preview.map((l, i) => (
            <li key={i}>
              <span className="muted">{formatDateBR(l.data)}</span>
              <span className="grow">{l.descricao}</span>
              <span className={`money ${l.valor > 0 ? 'pos' : ''}`}>{formatBRLSigned(l.valor)}</span>
            </li>
          ))}
        </ul>
      </div>
      <TextField label="Nome do banco (para lembrar)" value={banco} onChange={setBanco} placeholder="Opcional" />
      <button
        type="button"
        className="btn btn-primary"
        disabled={preview.length === 0}
        onClick={() => onConfirm({ ...m }, banco.trim())}
      >
        Usar estas colunas
      </button>
    </Sheet>
  );
}
