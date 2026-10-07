/** Entrega um arquivo ao usuário: compartilhamento (iPhone → "Salvar em Arquivos") ou download. */
export async function compartilharArquivo(
  blob: Blob,
  nome: string,
  titulo: string,
): Promise<'compartilhado' | 'baixado' | 'cancelado'> {
  const file = new File([blob], nome, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: titulo });
      return 'compartilhado';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelado';
      // Se o compartilhamento falhar por outro motivo, cai para o download.
    }
  }
  baixarArquivo(blob, nome);
  return 'baixado';
}

export function baixarArquivo(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** iPhone/iPad (inclui iPad com "modo computador"). */
export function ehIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function podeCompartilharArquivos(): boolean {
  if (typeof navigator === 'undefined' || typeof File === 'undefined') return false;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    return !!nav.canShare?.({ files: [new File(['x'], 'x.zip', { type: 'application/zip' })] });
  } catch {
    return false;
  }
}
