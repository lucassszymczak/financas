import { useRef, useState } from 'react';
import { Money } from '../../components/Money';
import { useToast } from '../../components/Toast';
import { db } from '../../lib/db/db';
import { getSettings } from '../../lib/db/settings';
import { converterLegado, gravarLegado, type PlanoImportacao, type ResumoImportacao } from '../../lib/importar/legado';

export function ImportarLegado() {
  const ref = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [prev, setPrev] = useState<{ plano: PlanoImportacao; resumo: ResumoImportacao } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  return (
    <section className="card stack-sm" aria-labelledby="lg-titulo">
      <h2 id="lg-titulo">Importar do app anterior</h2>
      <p className="small muted">Arquivo JSON no formato {'{config, months, fech}'}. Pode importar de novo sem duplicar.</p>
      <input
        ref={ref}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label="Escolher JSON do app anterior"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setErro(null);
          setPrev(null);
          try {
            setPrev(converterLegado(JSON.parse(await f.text()), await getSettings(db)));
          } catch (err) {
            setErro(err instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : (err as Error).message);
          }
        }}
      />
      <button type="button" className="btn" onClick={() => ref.current?.click()}>
        Escolher arquivo JSON
      </button>
      {erro && <p className="small neg">{erro}</p>}
      {prev && (
        <div className="card stack-sm" style={{ background: 'var(--surface-2)' }}>
          <strong>Resumo antes de gravar</strong>
          <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              {prev.resumo.lancamentos} lançamentos em {prev.resumo.meses} meses
            </li>
            <li>{prev.resumo.comprovantesPendentes} com comprovante a anexar (as fotos antigas não vêm no JSON)</li>
            <li>
              {prev.resumo.fixos} fixos · {prev.resumo.dividas} dívidas · {prev.resumo.fechamentos} fechamentos ·{' '}
              {prev.resumo.historico} meses de histórico · {prev.resumo.regras} regras
            </li>
            <li>
              Reserva <Money value={prev.resumo.reserva} /> · capital <Money value={prev.resumo.capital} />
            </li>
          </ul>
          {prev.resumo.avisos.map((a, i) => (
            <p key={i} className="small warn">
              {a}
            </p>
          ))}
          <p className="tiny muted">Os valores iniciais (reserva, capital, dívidas) serão substituídos pelos do arquivo.</p>
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={ocupado}
              onClick={async () => {
                setOcupado(true);
                try {
                  await gravarLegado(db, prev.plano);
                  toast.show(`${prev.resumo.lancamentos} lançamentos importados`);
                  setPrev(null);
                } finally {
                  setOcupado(false);
                }
              }}
            >
              Importar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setPrev(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
