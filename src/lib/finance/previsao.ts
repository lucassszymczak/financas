import type { FixedItem, Transaction } from '../db/schemas';

export type Previsao = {
  entradasPrevistas: number;
  saidasPrevistas: number;
  resultadoPrevisto: number;
  /** Sempre true: a previsão é uma estimativa. */
  estimativa: true;
};

/**
 * Previsão de fechamento do mês corrente.
 * saídas = max(fixos de saída lançados, fixos ativos de saída) + variáveis × dias_do_mês / dia_atual
 * entradas = max(entradas lançadas, fixos ativos de entrada)
 */
export function previsaoFechamento(params: {
  txs: readonly Pick<Transaction, 'tipo' | 'valor' | 'fixoId'>[];
  fixos: readonly Pick<FixedItem, 'tipo' | 'valor' | 'ativo'>[];
  dia: number;
  diasNoMes: number;
}): Previsao {
  const { txs, fixos, diasNoMes } = params;
  const dia = Math.min(Math.max(params.dia, 1), diasNoMes);

  let fixosSaidaLancados = 0;
  let variaveis = 0;
  let entradasLancadas = 0;
  for (const t of txs) {
    if (t.tipo === 'saida') {
      if (t.fixoId) fixosSaidaLancados += t.valor;
      else variaveis += t.valor;
    } else if (t.tipo === 'entrada') {
      entradasLancadas += t.valor;
    }
  }
  const fixosSaidaAtivos = fixos.filter((f) => f.ativo && f.tipo === 'saida').reduce((a, f) => a + f.valor, 0);
  const fixosEntradaAtivos = fixos.filter((f) => f.ativo && f.tipo === 'entrada').reduce((a, f) => a + f.valor, 0);

  const saidasPrevistas = Math.max(fixosSaidaLancados, fixosSaidaAtivos) + Math.round((variaveis * diasNoMes) / dia);
  const entradasPrevistas = Math.max(entradasLancadas, fixosEntradaAtivos);
  return {
    entradasPrevistas,
    saidasPrevistas,
    resultadoPrevisto: entradasPrevistas - saidasPrevistas,
    estimativa: true,
  };
}
