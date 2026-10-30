import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

type Pedido = {
  titulo: string;
  texto: ReactNode;
  ok: string;
  cancelar?: string;
  perigo?: boolean;
  resolver: (r: boolean) => void;
  id: number;
};

let proximoId = 0;

type Api = {
  confirmar: (o: { titulo: string; texto: ReactNode; ok?: string; cancelar?: string; perigo?: boolean }) => Promise<boolean>;
  avisar: (o: { titulo: string; texto: ReactNode }) => Promise<void>;
};

const Ctx = createContext<Api | null>(null);

export function DialogoProvider({ children }: { children: ReactNode }) {
  const [fila, setFila] = useState<Pedido[]>([]);
  const atual = fila[0];

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
            id: ++proximoId,
          },
        ]),
      ),
    [],
  );
  const avisar = useCallback<Api['avisar']>(
    (o) =>
      new Promise<void>((res) =>
        setFila((f) => [...f, { titulo: o.titulo, texto: o.texto, ok: 'Entendi', resolver: () => res(), id: ++proximoId }]),
      ),
    [],
  );

  const responder = (r: boolean) => {
    atual?.resolver(r);
    setFila((f) => f.slice(1));
  };

  return (
    <Ctx.Provider value={{ confirmar, avisar }}>
      {children}
      {atual && (
        <Modal key={atual.id} titulo={atual.titulo} onFechar={() => responder(false)} semFechar>
          <div className="modal-texto">{atual.texto}</div>
          <div className="modal-botoes">
            {atual.cancelar && (
              <button type="button" className="btn" onClick={() => responder(false)}>
                {atual.cancelar}
              </button>
            )}
            <button
              type="button"
              data-autofoco
              className={atual.perigo ? 'btn btn-perigo' : 'btn btn-primario'}
              onClick={() => responder(true)}
            >
              {atual.ok}
            </button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}

export function useDialogo(): Api {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDialogo fora do DialogoProvider');
  return c;
}
