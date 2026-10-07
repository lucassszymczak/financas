import { describe, expect, it } from 'vitest';
import type { Debt, Projecao } from '../db/schemas';
import { FLUXO_PADRAO, fluxoBase, simular12Meses } from './simulacao';

const proj = (p: Partial<Projecao> = {}): Projecao => ({
  resultadoManual: null,
  pisoReserva: 1_500_000,
  decimoNov: 0,
  decimoDez: 0,
  plrMarco: 0,
  restituicaoJunho: 0,
  janelaLongevidade: null,
  ...p,
});
const divida = (p: Partial<Debt>): Debt => ({
  id: 'd',
  nome: 'D',
  papel: 'outra',
  saldo: 0,
  taxaMensal: 0,
  parcela: 0,
  ordem: 0,
  ativo: true,
  ...p,
});

describe('fluxoBase', () => {
  it('manual > média > padrão', () => {
    expect(fluxoBase(proj({ resultadoManual: 10 }), 20)).toEqual({ valor: 10, origem: 'manual' });
    expect(fluxoBase(proj(), 20)).toEqual({ valor: 20, origem: 'media' });
    expect(fluxoBase(proj(), null)).toEqual({ valor: FLUXO_PADRAO, origem: 'padrao' });
  });
});

describe('simular12Meses', () => {
  it('sem dados usa −1.200 por mês e começa no mês seguinte ao aplicado', () => {
    const r = simular12Meses({
      ultimoMesAplicado: '2026-09',
      reserva: 2_000_000,
      capital: 0,
      longevidadeModo: '2/2',
      salarioBase: 1_000_000,
      dividas: [],
      projecao: proj(),
      mediaFechados: null,
    });
    expect(r.linhas).toHaveLength(12);
    expect(r.linhas[0]!.mes).toBe('2026-10');
    expect(r.linhas[11]!.mes).toBe('2027-09');
    expect(r.reservaFinal).toBe(2_000_000 - 12 * 120_000);
    expect(r.alertaReservaAbaixoPiso).toBe(true);
    expect(r.linhas[11]!.capital).toBe(12 * 40_000);
  });

  it('parcela de dívida quitada volta ao fluxo', () => {
    const r = simular12Meses({
      ultimoMesAplicado: '2026-09',
      reserva: 0,
      capital: 0,
      longevidadeModo: '2/2',
      salarioBase: 0,
      dividas: [divida({ papel: 'acordo', saldo: 20_000, parcela: 10_000 })],
      projecao: proj({ resultadoManual: 0 }),
      mediaFechados: null,
    });
    expect(r.linhas[0]!.fluxo).toBe(0);
    expect(r.linhas[1]!.fluxo).toBe(0);
    expect(r.linhas[2]!.fluxo).toBe(10_000);
  });

  it('extraordinário completa o piso, amortiza o consignado e a sobra vai à reserva', () => {
    const r = simular12Meses({
      ultimoMesAplicado: '2026-10',
      reserva: 1_000_000,
      capital: 0,
      longevidadeModo: '2/2',
      salarioBase: 0,
      dividas: [divida({ papel: 'consignado', saldo: 300_000, taxaMensal: 0, parcela: 100_000 })],
      projecao: proj({ resultadoManual: 0, decimoNov: 1_000_000 }),
      mediaFechados: null,
    });
    const nov = r.linhas[0]!;
    expect(nov.mes).toBe('2026-11');
    // parcela: 300k → 200k; extra 1M: 500k para o piso, 200k quita, 300k para a reserva
    expect(nov.consignado).toBe(0);
    expect(nov.reserva).toBe(1_000_000 + 500_000 + 300_000);
    expect(r.mesQuitacaoConsignado).toBe('2026-11');
    // a partir de dezembro, a parcela volta ao fluxo
    expect(r.linhas[1]!.fluxo).toBe(100_000);
  });

  it('custo extra do 6/6 a partir da janela', () => {
    const r = simular12Meses({
      ultimoMesAplicado: '2026-09',
      reserva: 0,
      capital: 0,
      longevidadeModo: '2/2',
      salarioBase: 1_000_000,
      dividas: [],
      projecao: proj({ resultadoManual: 0, janelaLongevidade: '2026-11' }),
      mediaFechados: null,
    });
    expect(r.linhas[0]!.fluxo).toBe(0);
    expect(r.linhas[0]!.modo).toBe('2/2');
    expect(r.linhas[1]!.fluxo).toBe(-40_000);
    expect(r.linhas[1]!.modo).toBe('6/6');
    expect(r.linhas[1]!.capital - r.linhas[0]!.capital).toBe(120_000);
  });

  it('dívida com juros evolui pela fórmula', () => {
    const r = simular12Meses({
      ultimoMesAplicado: '2026-09',
      reserva: 5_000_000,
      capital: 0,
      longevidadeModo: '2/2',
      salarioBase: 0,
      dividas: [divida({ papel: 'consignado', saldo: 1_000_000, taxaMensal: 2, parcela: 100_000 })],
      projecao: proj({ resultadoManual: 0 }),
      mediaFechados: null,
    });
    expect(r.linhas[0]!.consignado).toBe(920_000);
    expect(r.mesQuitacaoConsignado).toBe('2027-09');
    expect(r.alertaReservaAbaixoPiso).toBe(false);
  });
});
