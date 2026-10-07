import { describe, expect, it } from 'vitest';
import { acimaDoRitmo, podeGastar, quantoFalta, valeSubir } from './respostas';

describe('respostas rápidas', () => {
  it('posso gastar', () => {
    expect(podeGastar({ valor: 10_000, resultadoAtual: 50_000, previsao: 20_000 }).tom).toBe('pos');
    expect(podeGastar({ valor: 50_000, resultadoAtual: 50_000, previsao: 20_000 }).tom).toBe('warn');
    const r = podeGastar({ valor: 80_000, resultadoAtual: 50_000, previsao: 20_000 });
    expect(r.tom).toBe('neg');
    expect(r.fatos[0]).toContain('+R$ 500,00');
    expect(r.estimativas).toContain('Com esse gasto: −R$ 600,00.');
  });

  it('quanto falta', () => {
    const r = quantoFalta(
      [
        { id: 'a', nome: 'Acordo', papel: 'acordo', saldo: 100_000, taxaMensal: 0, parcela: 30_000, ordem: 0, ativo: true },
        { id: 'b', nome: 'Quitada', papel: 'outra', saldo: 0, taxaMensal: 0, parcela: 30_000, ordem: 1, ativo: true },
      ],
      '2026-10',
    );
    expect(r.veredito).toBe('Total devido: R$ 1.000,00.');
    expect(r.estimativas).toEqual(['Acordo: 4 parcelas, termina em fevereiro de 2027.']);
  });

  it('acima do ritmo', () => {
    const r = acimaDoRitmo({
      gastos: new Map([
        ['Lazer', 60_000],
        ['Mercado', 10_000],
      ]),
      tetos: { Lazer: 100_000, Mercado: 100_000 },
      dia: 10,
      diasNoMes: 30,
    });
    expect(r.tom).toBe('warn');
    expect(r.fatos).toHaveLength(1);
    expect(r.fatos[0]).toContain('Lazer');
    expect(acimaDoRitmo({ gastos: new Map(), tetos: {}, dia: 1, diasNoMes: 30 }).veredito).toContain('Nenhum teto');
  });

  it('vale subir', () => {
    const base = { modo: '2/2' as const, mesAtual: '2026-10', previsao: 0, salarioBase: 1_000_000 };
    expect(valeSubir({ ...base, mediaFechados: 100_000 })).toMatchObject({
      tom: 'pos',
      veredito: 'Sim. Subir para 6/6 em novembro de 2026.',
    });
    expect(valeSubir({ ...base, mediaFechados: -20_000 }).tom).toBe('warn');
    expect(valeSubir({ ...base, mediaFechados: -80_000 }).tom).toBe('neg');
    expect(valeSubir({ ...base, modo: '6/6', mediaFechados: null }).veredito).toBe('Já está em 6/6.');
  });
});
