import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { baixarArquivo } from '../lib/backup/share';
import { db } from '../lib/db/db';
import type { Transaction } from '../lib/db/schemas';
import { nomeComprovante } from '../lib/ir/exportar';
import { Sheet } from './Sheet';

/** Mostra o comprovante de um lançamento, com opção de baixar. */
export function ReceiptViewer({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  const r = useLiveQuery(async () => (tx?.comprovanteId ? db.receipts.get(tx.comprovanteId) : undefined), [tx?.comprovanteId]);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!r) return setUrl(null);
    const u = URL.createObjectURL(r.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [r]);
  return (
    <Sheet open={!!tx} onClose={onClose} title="Comprovante">
      {!r && <p className="muted">Sem comprovante.</p>}
      {r && url && r.tipoArquivo !== 'application/pdf' && (
        <img src={url} alt="Comprovante" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--line)' }} />
      )}
      {r && tx && (
        <button
          type="button"
          className="btn"
          onClick={() => baixarArquivo(r.blob, nomeComprovante(tx, r.tipoArquivo === 'image/png' ? 'png' : 'jpg'))}
        >
          Baixar
        </button>
      )}
    </Sheet>
  );
}
