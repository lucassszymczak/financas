import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastCtx = { show: (msg: string) => void };
const Ctx = createContext<ToastCtx>({ show: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 3200);
  }, []);
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div aria-live="polite" role="status">
        {msg && <div className="toast">{msg}</div>}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  return useContext(Ctx);
}
