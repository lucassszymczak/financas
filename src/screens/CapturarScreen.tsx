import { useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { ReviewItem } from '../components/ReviewItem';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { useFila } from '../hooks/FilaContext';
import { candidatoVazio, criarCandidato } from '../lib/capture/candidato';
import { carregarContexto, lancarFixosDoMes } from '../lib/capture/fila';
import { parseTextoLivre } from '../lib/capture/texto';
import { db } from '../lib/db/db';
import { currentMonth, monthLabel, todayISO } from '../lib/dates';
import { pedirLembreteBackup } from '../lib/lembretes';
import { go } from '../router';
import { FixosEditor } from './config/FixosEditor';
import { useProcessarArquivos } from './capturar/useProcessarArquivos';

export function CapturarScreen() {
  const { fila, adicionar, atualizar, remover, limpar, confirmar } = useFila();
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const [editarFixos, setEditarFixos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const fotosRef = useRef<HTMLInputElement>(null);
  const extratoRef = useRef<HTMLInputElement>(null);
  const { processar, progresso } = useProcessarArquivos();
  const mes = currentMonth();

  const interpretar = async () => {
    const itens = parseTextoLivre(texto);
    if (itens.length === 0) {
      toast.show('Não encontrei valor no texto.');
      return;
    }
    const ctx = await carregarContexto(db);
    await adicionar(
      itens.map((i) =>
        criarCandidato(
          { valor: i.valor, data: i.data, descricao: i.descricao, tipo: i.tipo, forma: i.forma, origem: 'texto' },
          ctx,
        ),
      ),
    );
    setTexto('');
  };

  const selecionados = fila.filter((c) => c.selecionado);

  return (
    <div className="stack">
      <h1>Capturar</h1>

      <section className="stack-sm" aria-label="Capturar gasto">
        <button type="button" className="btn btn-primary btn-hero" onClick={() => camRef.current?.click()}>
          <Icon name="camera" size={28} /> Tirar foto do gasto
        </button>
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Tirar foto do gasto"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            void processar(files, 'foto');
          }}
        />
        <div className="grid-2">
          <button type="button" className="btn" onClick={() => fotosRef.current?.click()}>
            <Icon name="images" /> Prints e fotos
          </button>
          <button type="button" className="btn" onClick={() => extratoRef.current?.click()}>
            <Icon name="file" /> Extrato
          </button>
        </div>
        <input
          ref={fotosRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="Escolher prints e fotos"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            void processar(files, 'print');
          }}
        />
        <input
          ref={extratoRef}
          type="file"
          accept=".ofx,.qfx,.csv,.txt,.pdf,application/pdf,text/csv,application/x-ofx"
          multiple
          className="sr-only"
          aria-label="Escolher extrato (OFX, CSV ou PDF)"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            void processar(files, 'extrato');
          }}
        />
        {progresso && (
          <div className="card stack-sm" role="status" aria-live="polite">
            <span className="small">{progresso.texto}</span>
            {progresso.pct !== null && (
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${Math.round(progresso.pct * 100)}%` }} />
              </div>
            )}
            {progresso.aviso && <span className="tiny muted">{progresso.aviso}</span>}
          </div>
        )}
      </section>

      <section className="card stack-sm" aria-labelledby="txt-titulo">
        <h2 id="txt-titulo">Por texto</h2>
        <textarea
          className="input"
          aria-labelledby="txt-titulo"
          placeholder={'gastei 87 no posto hoje\n42,50 farmácia ontem\nrecebi 400 do show'}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          enterKeyHint="done"
        />
        <p className="tiny muted">Dica: use o microfone do teclado para ditar. Uma frase por linha.</p>
        <button type="button" className="btn" disabled={!texto.trim()} onClick={interpretar}>
          Interpretar
        </button>
      </section>

      {fila.length > 0 && (
        <section className="stack-sm" aria-labelledby="fila-titulo">
          <div className="row-between">
            <h2 id="fila-titulo" style={{ margin: 0 }}>
              Revisão ({selecionados.length} de {fila.length})
            </h2>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (window.confirm('Descartar todos os itens da fila?')) limpar();
              }}
            >
              Limpar
            </button>
          </div>
          {fila.map((c) => (
            <ReviewItem
              key={c.tmpId}
              c={c}
              onChange={(p) => atualizar(c.tmpId, p)}
              onRemove={() => remover(c.tmpId)}
              inicialAberto={c.origem === 'manual' || c.origem === 'foto' || c.origem === 'print'}
            />
          ))}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={selecionados.length === 0 || salvando}
            onClick={async () => {
              setSalvando(true);
              try {
                const r = await confirmar();
                toast.show(`${r.salvos} ${r.salvos === 1 ? 'lançamento salvo' : 'lançamentos salvos'}`);
                if (r.extraordinarios > 0) {
                  pedirLembreteBackup('Extraordinário lançado.');
                  go('plano');
                }
              } finally {
                setSalvando(false);
              }
            }}
          >
            Confirmar {selecionados.length} {selecionados.length === 1 ? 'item' : 'itens'}
          </button>
        </section>
      )}

      <section className="stack-sm" aria-label="Outros lançamentos">
        <button
          type="button"
          className="btn btn-block"
          onClick={() => adicionar([candidatoVazio(todayISO())], { checarDuplicados: false })}
        >
          <Icon name="plus" /> Lançamento manual
        </button>
        <button
          type="button"
          className="btn btn-block"
          onClick={async () => {
            const n = await lancarFixosDoMes(db, mes);
            toast.show(n === 0 ? 'Fixos do mês já lançados' : `${n} fixos lançados em ${monthLabel(mes)}`);
          }}
        >
          Lançar fixos de {monthLabel(mes)}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => setEditarFixos(true)}>
          Editar fixos
        </button>
      </section>

      <Sheet open={editarFixos} onClose={() => setEditarFixos(false)} title="Fixos">
        <FixosEditor titulo="Lista de fixos" />
      </Sheet>
    </div>
  );
}
