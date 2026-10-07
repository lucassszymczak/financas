import { describe, expect, it } from 'vitest';
import { mediaResultados, resultadoMes, totaisPorCategoria } from './resultado';

describe('resultadoMes', () => {
  it('considera só entrada e saída', () => {
    const r = resultadoMes([
      { tipo: 'entrada', valor: 500_000 },
      { tipo: 'saida', valor: 120_000 },
      { tipo: 'saida', valor: 30_000 },
      { tipo: 'trabalho', valor: 99_999 },
      { tipo: 'extra_in', valor: 1_000_000 },
      { tipo: 'extra_out', valor: 500_000 },
    ]);
    expect(r).toEqual({ entradas: 500_000, saidas: 150_000, resultado: 350_000 });
  });
  it('mês vazio = 0', () => {
    expect(resultadoMes([]).resultado).toBe(0);
  });
});

describe('totaisPorCategoria', () => {
  it('agrupa e ordena', () => {
    const r = totaisPorCategoria(
      [
        { tipo: 'saida', valor: 100, categoria: 'A' },
        { tipo: 'saida', valor: 300, categoria: 'B' },
        { tipo: 'saida', valor: 50, categoria: 'A' },
        { tipo: 'entrada', valor: 999, categoria: 'A' },
      ],
      'saida',
    );
    expect(r).toEqual([
      { categoria: 'B', total: 300 },
      { categoria: 'A', total: 150 },
    ]);
  });
});

describe('mediaResultados', () => {
  it('média arredondada ou null', () => {
    expect(mediaResultados([])).toBeNull();
    expect(mediaResultados([100, -301])).toBe(-100);
  });
});
