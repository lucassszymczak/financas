import { describe, expect, it } from 'vitest';
import { aliquotaIR, diasUteis } from './ir';
import { compararCdbLca, fatorCdi } from './cdb';
import { compararTitulos, inflacaoImplicita } from './titulos';
import { anualParaMensal, mensalParaAnual, valorFuturo } from './taxas';
import { projetarCapital } from './capital';
import { bushelParaSacaReais, sacaReaisParaBushel } from './conversao';

describe('IR regressivo', () => {
  it.each([
    [1, 0.225],
    [180, 0.225],
    [181, 0.2],
    [360, 0.2],
    [361, 0.175],
    [720, 0.175],
    [721, 0.15],
    [3650, 0.15],
  ])('%i dias → %f', (dias, aliq) => expect(aliquotaIR(dias)).toBe(aliq));

  it('dias úteis aproximados', () => expect(diasUteis(365)).toBe(252));
});

describe('CDB x LCA', () => {
  it('100% do CDI por 252 dias úteis rende o CDI do ano', () => {
    expect(fatorCdi(0.15, 1, 252)).toBeCloseTo(1.15, 10);
  });
  it('LCA de 90% vence CDB de 100% em 1 ano (IR de 17,5%)', () => {
    const r = compararCdbLca({ valor: 10000, dias: 365, pctCdb: 1, pctLca: 0.9, cdiAnual: 0.15 });
    expect(r.aliquota).toBe(0.175);
    expect(r.cdb.bruto).toBeCloseTo(11500, 2);
    expect(r.cdb.ir).toBeCloseTo(262.5, 2);
    expect(r.cdb.liquido).toBeCloseTo(11237.5, 2);
    expect(r.vencedor).toBe('lca');
    // O CDB equivalente fica abaixo da regra de bolso 90/(1−0,175) = 109,1% por causa dos juros compostos.
    expect(r.cdbEquivalente).toBeCloseTo(1.0772, 3);
    expect(r.cdbEquivalente).toBeLessThan(0.9 / 0.825);
    const empate = compararCdbLca({ valor: 10000, dias: 365, pctCdb: r.cdbEquivalente, pctLca: 0.9, cdiAnual: 0.15 });
    expect(empate.cdb.liquido).toBeCloseTo(empate.lca.liquido, 4);
  });
});

describe('break-even e títulos', () => {
  it('inflação implícita', () => {
    expect(inflacaoImplicita(0.1273, 0.075)).toBeCloseTo(1.1273 / 1.075 - 1, 12);
    expect(inflacaoImplicita(0.1273, 0.075)).toBeCloseTo(0.048651, 5);
  });
  it('com inflação esperada igual à implícita, prefixado e IPCA+ empatam', () => {
    const imp = inflacaoImplicita(0.12, 0.07);
    const r = compararTitulos({
      valor: 1000,
      anos: 3,
      pre: 0.12,
      real: 0.07,
      inflacaoEsperada: imp,
      cdiEsperado: 0.1,
      pctCdi: 1,
      descontarIR: true,
    });
    expect(r.alternativas[0]!.liquido).toBeCloseTo(r.alternativas[1]!.liquido, 6);
  });
  it('aplica IR de 15% acima de 2 anos', () => {
    const r = compararTitulos({
      valor: 1000,
      anos: 3,
      pre: 0.1,
      real: 0.05,
      inflacaoEsperada: 0.04,
      cdiEsperado: 0.1,
      pctCdi: 1,
      descontarIR: true,
    });
    const pre = r.alternativas[0]!;
    expect(pre.bruto).toBeCloseTo(1331, 6);
    expect(pre.ir).toBeCloseTo(331 * 0.15, 6);
  });
});

describe('conversão de taxas e juros compostos', () => {
  it('1% a.m. ≈ 12,68% a.a.', () => expect(mensalParaAnual(0.01)).toBeCloseTo(0.126825, 6));
  it('ida e volta', () => expect(mensalParaAnual(anualParaMensal(0.1475))).toBeCloseTo(0.1475, 12));
  it('valor futuro com aportes', () => {
    expect(valorFuturo(1000, 100, 0.01, 12)).toBeCloseTo(1000 * 1.01 ** 12 + (100 * (1.01 ** 12 - 1)) / 0.01, 8);
    expect(valorFuturo(0, 100, 0, 12)).toBe(1200);
  });
});

describe('capital social', () => {
  it('sem juros nem sobras, saldo = aportes', () => {
    const r = projetarCapital({ inicial: 1000, aporteMensal: 100, meses: 24, taxaAnual: 0, sobrasAnual: 0, irJuros: false });
    expect(r.saldo).toBe(3400);
    expect(r.porAno).toHaveLength(2);
  });
  it('juros anuais compostos mês a mês e IR de 15%', () => {
    const r = projetarCapital({ inicial: 1000, aporteMensal: 0, meses: 12, taxaAnual: 0.1, sobrasAnual: 0, irJuros: false });
    expect(r.saldo).toBeCloseTo(1100, 6);
    const comIr = projetarCapital({ inicial: 1000, aporteMensal: 0, meses: 12, taxaAnual: 0.1, sobrasAnual: 0, irJuros: true });
    expect(comIr.irJuros).toBeGreaterThan(14);
    expect(comIr.saldo).toBeLessThan(1100);
  });
  it('sobras creditadas no fim de cada ano', () => {
    const r = projetarCapital({ inicial: 1000, aporteMensal: 0, meses: 12, taxaAnual: 0, sobrasAnual: 0.05, irJuros: false });
    expect(r.sobras).toBeCloseTo(50, 8);
    expect(r.saldo).toBeCloseTo(1050, 8);
  });
});

describe('saca e bushel', () => {
  it('soja: US$ 12,63/bu com dólar 5,087 → R$/saca', () => {
    expect(bushelParaSacaReais(12.63, 5.087, 'soja')).toBeCloseTo(12.63 * (60 / 27.2155) * 5.087, 8);
  });
  it('ida e volta', () => {
    expect(sacaReaisParaBushel(bushelParaSacaReais(4.8, 5, 'milho'), 5, 'milho')).toBeCloseTo(4.8, 10);
  });
});
