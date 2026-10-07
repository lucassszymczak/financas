import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { SelectField } from '../components/Field';
import { Money } from '../components/Money';
import { ReceiptViewer } from '../components/ReceiptViewer';
import { useToast } from '../components/Toast';
import { TransactionEditor } from '../components/TransactionEditor';
import { useAllTransactions } from '../hooks/useData';
import { compartilharArquivo } from '../lib/backup/share';
import { comprimirComprovante } from '../lib/capture/imagem';
import { db } from '../lib/db/db';
import type { Transaction } from '../lib/db/schemas';
import { formatDateBR } from '../lib/dates';
import { newId } from '../lib/id';
import { csvDedutiveis, csvLancamentos, doAno, totaisIR, zipComprovantesAno } from '../lib/ir/exportar';

function Linha({
  t,
  onVer,
  onEditar,
  onAnexar,
}: {
  t: Transaction;
  onVer: () => void;
  onEditar: () => void;
  onAnexar?: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="grow"
        onClick={onEditar}
        style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', minWidth: 0, minHeight: 44 }}
      >
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.beneficiario || t.estabelecimento || t.descricao || t.categoria}
        </div>
        <div className="small muted">
          {formatDateBR(t.data)}
          {t.cnpj ? ` · ${t.cnpj}` : t.dedutivel ? ' · sem CNPJ' : ''}
        </div>
      </button>
      <Money value={t.valor} />
      {t.comprovanteId ? (
        <button type="button" className="btn" onClick={onVer}>
          Ver
        </button>
      ) : onAnexar ? (
        <button type="button" className="btn btn-primary" onClick={onAnexar}>
          Anexar
        </button>
      ) : null}
    </li>
  );
}

export function IrScreen() {
  const txs = useAllTransactions();
  const toast = useToast();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [ver, setVer] = useState<Transaction | null>(null);
  const [editar, setEditar] = useState<Transaction | null>(null);
  const [anexarEm, setAnexarEm] = useState<Transaction | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const anos = useLiveQuery(async () => {
    const primeiro = (await db.transactions.orderBy('data').first())?.data.slice(0, 4);
    const ini = Math.min(Number(primeiro ?? anoAtual), anoAtual);
    return Array.from({ length: anoAtual - ini + 1 }, (_, i) => anoAtual - i);
  }, [anoAtual]);
  if (!txs || !anos) return null;

  const doAnoTx = doAno(txs, ano);
  const totais = totaisIR(txs, ano);
  const dedutiveis = doAnoTx.filter((t) => t.dedutivel);
  const pendentes = dedutiveis.filter((t) => !t.comprovanteId);
  const outros = doAnoTx.filter((t) => !t.dedutivel && t.comprovanteId);

  const exportar = async (tipo: 'lanc' | 'ded' | 'zip') => {
    if (tipo === 'zip') {
      const r = await zipComprovantesAno(db, ano);
      if (r.quantidade === 0) return toast.show('Nenhum comprovante guardado neste ano.');
      await compartilharArquivo(r.blob, `comprovantes-${ano}.zip`, `Comprovantes ${ano}`);
      return;
    }
    const csv = tipo === 'lanc' ? csvLancamentos(txs, ano) : csvDedutiveis(txs, ano);
    const nome = tipo === 'lanc' ? `lancamentos-${ano}.csv` : `dedutiveis-${ano}.csv`;
    await compartilharArquivo(new Blob([csv], { type: 'text/csv;charset=utf-8' }), nome, nome);
  };

  return (
    <div className="stack">
      <h1>IR e comprovantes</h1>
      <SelectField
        label="Ano-calendário"
        value={String(ano)}
        onChange={(v) => setAno(Number(v))}
        options={anos.map((a) => String(a))}
      />
      <section className="grid-2" aria-label="Totais dedutíveis">
        <div className="card">
          <span className="small muted">Saúde</span>
          <div className="money" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            <Money value={totais.saude} />
          </div>
        </div>
        <div className="card">
          <span className="small muted">Educação</span>
          <div className="money" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            <Money value={totais.educacao} />
          </div>
        </div>
      </section>

      {pendentes.length > 0 && (
        <p className="banner" role="status">
          {pendentes.length} {pendentes.length === 1 ? 'dedutível sem comprovante' : 'dedutíveis sem comprovante'}.
        </p>
      )}

      <section className="card stack-sm" aria-labelledby="ded-titulo">
        <h2 id="ded-titulo">Dedutíveis ({dedutiveis.length})</h2>
        {dedutiveis.length === 0 && <p className="small muted">Nenhum neste ano.</p>}
        <ul className="list">
          {dedutiveis.map((t) => (
            <Linha
              key={t.id}
              t={t}
              onVer={() => setVer(t)}
              onEditar={() => setEditar(t)}
              onAnexar={() => {
                setAnexarEm(t);
                fileRef.current?.click();
              }}
            />
          ))}
        </ul>
      </section>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Foto do comprovante"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f || !anexarEm) return;
          const blob = await comprimirComprovante(f);
          const id = newId();
          await db.transaction('rw', db.receipts, db.transactions, async () => {
            await db.receipts.add({ id, blob, criadoEm: new Date().toISOString(), tipoArquivo: 'image/jpeg' });
            await db.transactions.update(anexarEm.id, { comprovanteId: id, comprovantePendente: false });
          });
          setAnexarEm(null);
          toast.show('Comprovante anexado');
        }}
      />

      <section className="card stack-sm" aria-labelledby="out-titulo">
        <h2 id="out-titulo">Outros comprovantes guardados ({outros.length})</h2>
        {outros.length === 0 && <p className="small muted">Nenhum neste ano.</p>}
        <ul className="list">
          {outros.map((t) => (
            <Linha key={t.id} t={t} onVer={() => setVer(t)} onEditar={() => setEditar(t)} />
          ))}
        </ul>
      </section>

      <section className="card stack-sm" aria-labelledby="exp-titulo">
        <h2 id="exp-titulo">Exportar {ano}</h2>
        <button type="button" className="btn" onClick={() => exportar('ded')}>
          CSV de dedutíveis
        </button>
        <button type="button" className="btn" onClick={() => exportar('lanc')}>
          CSV de lançamentos do ano
        </button>
        <button type="button" className="btn" onClick={() => exportar('zip')}>
          ZIP com os comprovantes
        </button>
        <p className="tiny muted">CSV com “;” e vírgula decimal: abre direto no Excel ou Numbers.</p>
      </section>

      <ReceiptViewer tx={ver} onClose={() => setVer(null)} />
      <TransactionEditor tx={editar} onClose={() => setEditar(null)} />
    </div>
  );
}
