import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Pedido = {
  titulo: string;
  texto: ReactNode;
  ok: string;
  cancelar?: string;
  perigo?: boolean;
  resolver: (r: boolean) => void;
};

type Api = {
  confirmar: (o: { titulo: string; texto: ReactNode; ok?: string; cancelar?: string; perigo?: boolean }) => Promise<boolean>;
  avisar: (o: { titulo: string; texto: ReactNode }) => Promise<void>;
};

const Ctx = createContext<Api | null>(null);

export function DialogoProvider({ children }: { children: ReactNode }) {
  const [fila, setFila] = useState<Pedido[]>([]);
  const atual = fila[0];
  const okRef = useRef<HTMLButtonElement>(null);

  const confirmar = useCallback<Api['confirmar']>(
    (o) =>
      new Promise<boolean>((resolver) =>
        setFila((f) => [
          ...f,
          {
            titulo: o.titulo,
            texto: o.texto,
            ok: o.ok ?? 'Confirmar',
            cancelar: o.cancelar ?? 'Cancelar',
            perigo: o.perigo,
            resolver,
          },
        ]),
      ),
    [],
  );
  const avisar = useCallback<Api['avisar']>(
    (o) =>
      new Promise<void>((res) =>
        setFila((f) => [...f, { titulo: o.titulo, texto: o.texto, ok: 'Entendi', resolver: () => res() }]),
      ),
    [],
  );

  const responder = (r: boolean) => {
    atual?.resolver(r);
    setFila((f) => f.slice(1));
  };

  useEffect(() => {
    if (!atual) return;
    okRef.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        atual.resolver(false);
        setFila((f) => f.slice(1));
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [atual]);

  return (
    <Ctx.Provider value={{ confirmar, avisar }}>
      {children}
      {atual && (
        <div className="modal-fundo" onClick={() => responder(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dlg-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dlg-titulo">{atual.titulo}</h2>
            <div className="modal-texto">{atual.texto}</div>
            <div className="modal-botoes">
              {atual.cancelar && (
                <button type="button" className="btn" onClick={() => responder(false)}>
                  {atual.cancelar}
                </button>
              )}
              <button
                type="button"
                ref={okRef}
                className={atual.perigo ? 'btn btn-perigo' : 'btn btn-primario'}
                onClick={() => responder(true)}
              >
                {atual.ok}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useDialogo(): Api {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDialogo fora do DialogoProvider');
  return c;
}
