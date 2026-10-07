import { semAcentos } from '../finance/chave';

/** Minúsculas, sem acentos, só letras/dígitos separados por espaço simples. */
export function normalizar(texto: string): string {
  return semAcentos(texto.toLowerCase())
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
