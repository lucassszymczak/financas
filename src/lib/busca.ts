import type { Preco } from '../schema/radar';

/** Tira acentos e caixa para comparar ("Petróleo" casa com "petroleo"). */
export const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * Busca por código, nome, setor ou grupo. Código exato vem primeiro, depois código que começa
 * com o termo, depois o restante.
 */
export function buscarAtivos(precos: Preco[], termo: string, limite = 60): Preco[] {
  const t = normalizar(termo);
  if (!t) return [];
  const pontuados: { p: Preco; n: number }[] = [];
  for (const p of precos) {
    const id = normalizar(p.id);
    const curto = normalizar(p.nome_curto ?? '');
    let n = 0;
    if (id === t || curto === t) n = 3;
    else if (id.startsWith(t) || curto.startsWith(t)) n = 2;
    else if ([p.nome, p.setor ?? '', p.grupo ?? '', p.regiao ?? ''].some((c) => normalizar(c).includes(t))) n = 1;
    if (n) pontuados.push({ p, n });
  }
  return pontuados
    .sort((a, b) => b.n - a.n || a.p.id.localeCompare(b.p.id))
    .slice(0, limite)
    .map((x) => x.p);
}
