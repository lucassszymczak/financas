import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Candidato } from '../lib/capture/candidato';
import { confirmarFila, marcarDuplicadosNaFila, type ResultadoConfirmacao } from '../lib/capture/fila';
import { db } from '../lib/db/db';

type FilaCtx = {
  fila: Candidato[];
  adicionar: (novos: Candidato[], opts?: { checarDuplicados?: boolean }) => Promise<void>;
  atualizar: (tmpId: string, patch: Partial<Candidato>) => void;
  remover: (tmpId: string) => void;
  limpar: () => void;
  confirmar: () => Promise<ResultadoConfirmacao>;
};

const Ctx = createContext<FilaCtx | null>(null);

/** Fila de revisão compartilhada entre as telas (fica na memória até confirmar). */
export function FilaProvider({ children }: { children: ReactNode }) {
  const [fila, setFila] = useState<Candidato[]>([]);
  const ref = useRef(fila);
  useEffect(() => {
    ref.current = fila;
  }, [fila]);

  const adicionar = useCallback(async (novos: Candidato[], opts?: { checarDuplicados?: boolean }) => {
    if (novos.length === 0) return;
    const marcados = opts?.checarDuplicados === false ? novos : await marcarDuplicadosNaFila(db, novos, ref.current);
    setFila((f) => [...marcados, ...f]);
  }, []);

  const atualizar = useCallback((tmpId: string, patch: Partial<Candidato>) => {
    setFila((f) => f.map((c) => (c.tmpId === tmpId ? { ...c, ...patch } : c)));
  }, []);

  const remover = useCallback((tmpId: string) => setFila((f) => f.filter((c) => c.tmpId !== tmpId)), []);
  const limpar = useCallback(() => setFila([]), []);

  const confirmar = useCallback(async () => {
    const r = await confirmarFila(db, fila);
    // Mantém na fila apenas o que não foi selecionado.
    setFila((f) => f.filter((c) => !c.selecionado));
    return r;
  }, [fila]);

  const value = useMemo(
    () => ({ fila, adicionar, atualizar, remover, limpar, confirmar }),
    [fila, adicionar, atualizar, remover, limpar, confirmar],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFila(): FilaCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFila fora do FilaProvider');
  return c;
}
