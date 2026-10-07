import { useEffect, useRef, type ReactNode } from 'react';

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode };

/** Janela modal acessível baseada em <dialog>. */
export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onCancel={onClose} aria-label={title}>
      {open && (
        <div className="sheet-body">
          <div className="row-between">
            <h2 style={{ margin: 0 }}>{title}</h2>
            <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
