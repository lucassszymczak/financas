/** Linha genérica de extrato: valor com sinal (negativo = saída). */
export type LinhaExtrato = { data: string; valor: number; descricao: string };

/** Decodifica bytes como UTF-8; se houver caracteres inválidos, usa Windows-1252 (comum em OFX/CSV de bancos). */
export function decodificarTexto(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const utf8 = new TextDecoder('utf-8').decode(u8);
  if (!utf8.includes('\uFFFD')) return utf8.replace(/^\uFEFF/, '');
  return new TextDecoder('windows-1252').decode(u8);
}
