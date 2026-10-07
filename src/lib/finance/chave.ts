/** Remove acentos. */
export function semAcentos(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Chave do estabelecimento: minúsculas, sem acentos, só letras,
 * palavras com mais de 1 letra, primeiras 3 palavras.
 */
export function chaveEstabelecimento(texto: string): string {
  return semAcentos(texto.toLowerCase())
    .replace(/[^a-z]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1)
    .slice(0, 3)
    .join(' ');
}
