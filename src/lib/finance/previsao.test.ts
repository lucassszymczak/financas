import { describe, expect, it } from 'vitest';
import { previsaoFechamento } from './previsao';

const fixos = [
  { tipo: 'saida' as const, valor: 200_000, ativo: true },
  { tipo: 'saida' as const, valor: 50_000, ativo: true },
  { tipo: 'saida' as const, valor: 99_999, ativo: false },
  { tipo: 'entrada' as const, valor: 800_000, ativo: true },
];

describe('previsaoFechamento', () => {
  it('usa fixos ativos quando ainda não foram lançados e projeta variáveis', () => {
    const p = previsaoFechamento({
      txs: [{ tipo: 'saida', valor: 30_000, fixoId: null }],
      fixos,
      dia: 10,
      diasNoMes: 30,
    });
    expect(p.saidasPrevistas).toBe(250_000 + 90_000);
    expect(p.entradasPrevistas).toBe(800_000);
    expect(p.resultadoPrevisto).toBe(800_000 - 340_000);
    expect(p.estimativa).toBe(true);
  });

  it('usa o maior entre fixos lançados e fixos ativos; entradas lançadas maiores prevalecem', () => {
    const p = previsaoFechamento({
      txs: [
        { tipo: 'saida', valor: 300_000, fixoId: 'f1' },
        { tipo: 'entrada', valor: 900_000, fixoId: null },
        { tipo: 'saida', valor: 31_000, fixoId: null },
      ],
      fixos,
      dia: 31,
      diasNoMes: 31,
    });
    expect(p.saidasPrevistas).toBe(331_000);
    expect(p.entradasPrevistas).toBe(900_000);
  });

  it('dia 0 é tratado como dia 1', () => {
    const p = previsaoFechamento({ txs: [{ tipo: 'saida', valor: 1_000, fixoId: null }], fixos: [], dia: 0, diasNoMes: 30 });
    expect(p.saidasPrevistas).toBe(30_000);
  });
});
