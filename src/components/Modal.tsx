import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Pop-up padrão do app: fundo escurecido e desfocado, fecha com Esc, clique fora ou no ✕.
 * Trava a rolagem da página enquanto está aberto e devolve o foco a quem abriu.
 */
export function Modal({
  titulo,
  onFechar,
  children,
  largo = false,
  cabecalho,
  semFechar = false,
}: {
  titulo: ReactNode;
  onFechar: () => void;
  children: ReactNode;
  largo?: boolean;
  /** Conteúdo extra abaixo do título (ex.: valor e variação). */
  cabecalho?: ReactNode;
  /** Diálogos de confirmação usam os próprios botões em vez do ✕. */
  semFechar?: boolean;
}) {
  const idTitulo = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar.current();
    };
    window.addEventListener('keydown', tecla);
    // Trava a rolagem do fundo (contando quantos pop-ups estão abertos).
    const corpo = document.body;
    corpo.dataset.modais = String(Number(corpo.dataset.modais ?? 0) + 1);
    corpo.classList.add('com-modal');
    const foco =
      caixa.current?.querySelector<HTMLElement>('[data-autofoco]') ??
      caixa.current?.querySelector<HTMLElement>('button, a, input, select');
    foco?.focus();
    return () => {
      window.removeEventListener('keydown', tecla);
      const n = Number(corpo.dataset.modais ?? 1) - 1;
      corpo.dataset.modais = String(n);
      if (n <= 0) corpo.classList.remove('com-modal');
      anterior?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="modal-fundo" onClick={onFechar}>
      <div
        ref={caixa}
        className={`modal${largo ? ' modal-largo' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-cabeca">
          <div className="modal-titulo">
            <h2 id={idTitulo}>{titulo}</h2>
            {cabecalho}
          </div>
          {!semFechar && (
            <button type="button" className="btn btn-icone" onClick={onFechar} aria-label="Fechar">
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
