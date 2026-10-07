/** Lembrete de backup pedido por uma ação (extraordinário lançado, mês fechado). */
const KEY = 'lembrete-backup';
const EVENT = 'lembrete-backup';

export function pedirLembreteBackup(motivo: string): void {
  try {
    sessionStorage.setItem(KEY, motivo);
  } catch {
    /* sem sessionStorage: segue só com o evento */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: motivo }));
}

export function lembretePendente(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function limparLembreteBackup(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignora */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: null }));
}

export function onLembreteBackup(fn: (motivo: string | null) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<string | null>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}
