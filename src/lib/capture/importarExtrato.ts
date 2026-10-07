import type { Forma } from '../db/schemas';
import { criarCandidato, type Candidato, type ContextoCategorizacao } from './candidato';
import type { LinhaExtrato } from './extrato';

/** Converte linhas de extrato em candidatos da fila (negativo = saída, positivo = entrada). */
export function linhasParaCandidatos(linhas: readonly LinhaExtrato[], forma: Forma, ctx: ContextoCategorizacao): Candidato[] {
  return linhas.map((l) =>
    criarCandidato(
      {
        valor: Math.abs(l.valor),
        data: l.data,
        descricao: l.descricao,
        estabelecimento: l.descricao,
        tipo: l.valor < 0 ? 'saida' : 'entrada',
        forma,
        origem: 'extrato',
      },
      ctx,
    ),
  );
}
