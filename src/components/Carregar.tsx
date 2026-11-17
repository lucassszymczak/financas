import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useDialogo } from './Dialogo';
import { useEstado } from '../state';
import { lerArquivo } from '../lib/importar';
import * as db from '../lib/db';
import { dataCurta } from '../lib/formato';
import { chaveEdicao, compararEdicoes, rotuloTipo } from '../lib/edicoes';
import type { Radar } from '../schema/radar';
import exemplo from '../schema/exemplo.json';

type Api = {
  importar: (arquivos: Iterable<File> | File[]) => Promise<void>;
  carregarExemplo: () => Promise<void>;
  aviso: (texto: string) => void;
};

const Ctx = createContext<Api | null>(null);

/** Importação de arquivos (botão, arrastar e soltar, exemplo) e avisos rápidos. */
export function CarregarProvider({ children }: { children: ReactNode }) {
  const { recarregar, abrirEdicao } = useEstado();
  const { confirmar, avisar } = useDialogo();
  const [toast, setToast] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const aviso = useCallback((t: string) => setToast(t), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const importar = useCallback(
    async (lista: Iterable<File> | File[]) => {
      const arquivos = [...lista];
      if (!arquivos.length) return;
      const erros: { nome: string; erros: string[] }[] = [];
      const salvas: string[] = [];
      // Lê tudo antes de gravar e grava em ordem fixa (data, depois horário da edição):
      // o resultado é o mesmo em qualquer ordem de arquivos.
      const lidos: { nome: string; radar: Radar; bruto: unknown }[] = [];
      for (const arq of arquivos) {
        const lido = await lerArquivo(arq);
        if (lido.ok) lidos.push(lido);
        else erros.push({ nome: lido.nome, erros: lido.erros });
      }
      lidos.sort((x, y) => x.radar.edicao.data.localeCompare(y.radar.edicao.data) || compararEdicoes(x.radar, y.radar));
      // Dois arquivos da mesma edição no mesmo lote: vale o gerado por último.
      const porChave = new Map<string, (typeof lidos)[number]>();
      for (const l of lidos) porChave.set(chaveEdicao(l.radar), l);
      for (const [chave, lido] of porChave) {
        const data = lido.radar.edicao.data;
        const rotulo = `${dataCurta(data)} (${rotuloTipo(lido.radar).toLowerCase()})`;
        if (await db.existeEdicao(chave)) {
          const sim = await confirmar({
            titulo: 'Edição já existe',
            texto: `Já existe uma edição de ${rotulo} salva. Quer substituir pela do arquivo "${lido.nome}"?`,
            ok: 'Substituir',
            cancelar: 'Manter a atual',
          });
          if (!sim) continue;
        }
        await db.salvarEdicao({ chave, data, bruto: lido.bruto, importadoEm: new Date().toISOString() });
        salvas.push(rotulo);
      }
      if (salvas.length) {
        await recarregar();
        abrirEdicao(null);
        aviso(salvas.length === 1 ? `Edição de ${salvas[0]} carregada.` : `${salvas.length} edições carregadas.`);
      }
      if (erros.length) {
        await avisar({
          titulo: erros.length === 1 ? 'Arquivo inválido' : `${erros.length} arquivos inválidos`,
          texto: (
            <div className="erros-importacao">
              {erros.map((e) => (
                <div key={e.nome}>
                  <strong>{e.nome}</strong>
                  <ul>
                    {e.erros.map((m) => (
                      <li key={m}>
                        <code>{m}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="mudo">Nada foi alterado para esses arquivos. Confira o formato em docs/schema.md.</p>
            </div>
          ),
        });
      }
    },
    [abrirEdicao, avisar, aviso, confirmar, recarregar],
  );

  const carregarExemplo = useCallback(async () => {
    const arquivo = new File([JSON.stringify(exemplo)], 'radar_exemplo.json', { type: 'application/json' });
    await importar([arquivo]);
  }, [importar]);

  // Arrastar e soltar em qualquer lugar da janela (desktop).
  useEffect(() => {
    let profundidade = 0;
    const temArquivo = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');
    const entra = (e: DragEvent) => {
      if (!temArquivo(e)) return;
      profundidade++;
      setArrastando(true);
    };
    const sai = () => {
      profundidade = Math.max(0, profundidade - 1);
      if (!profundidade) setArrastando(false);
    };
    const sobre = (e: DragEvent) => {
      if (temArquivo(e)) e.preventDefault();
    };
    const solta = (e: DragEvent) => {
      if (!temArquivo(e)) return;
      e.preventDefault();
      profundidade = 0;
      setArrastando(false);
      void importar(e.dataTransfer?.files ?? []);
    };
    window.addEventListener('dragenter', entra);
    window.addEventListener('dragleave', sai);
    window.addEventListener('dragover', sobre);
    window.addEventListener('drop', solta);
    return () => {
      window.removeEventListener('dragenter', entra);
      window.removeEventListener('dragleave', sai);
      window.removeEventListener('dragover', sobre);
      window.removeEventListener('drop', solta);
    };
  }, [importar]);

  return (
    <Ctx.Provider value={{ importar, carregarExemplo, aviso }}>
      {children}
      {arrastando && (
        <div className="soltar-aqui" aria-hidden="true">
          <div>Solte o arquivo do Radar aqui</div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useCarregar(): Api {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCarregar fora do CarregarProvider');
  return c;
}

/** Botão "Carregar Radar do dia": abre o seletor de arquivos (aceita vários). */
export function BotaoCarregar({ compacto = false, className = 'btn btn-primario' }: { compacto?: boolean; className?: string }) {
  const { importar } = useCarregar();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => ref.current?.click()}
        title="Carregar Radar do dia"
        aria-label="Carregar Radar do dia"
      >
        <svg className="icone-carregar" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 11v2.5h11V11" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        {compacto ? <span className="so-desktop">Carregar</span> : <span>Carregar Radar do dia</span>}
      </button>
      <input
        ref={ref}
        type="file"
        accept=".json,application/json"
        multiple
        hidden
        data-testid="input-arquivo"
        onChange={(e) => {
          const files = e.target.files ? [...e.target.files] : [];
          e.target.value = '';
          void importar(files);
        }}
      />
    </>
  );
}
