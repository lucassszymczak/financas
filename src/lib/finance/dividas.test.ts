import { describe, expect, it } from 'vitest';
import type { Debt } from '../db/schemas';
import {
  aplicarParcela,
  aplicarParcelasDoMes,
  efeitoAmortizacao,
  mesesRestantes,
  mesTermino,
  proximoMesAplicavel,
} from './dividas';

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

describe('aplicarParcela', () => {
  it('com juros', () => {
    expect(aplicarParcela({ saldo: 1_000_000, taxaMensal: 2, parcela: 100_000 })).toEqual({
      saldo: 920_000,
      juros: 20_000,
      pago: 100_000,
    });
  });
  it('sem juros', () => {
    expect(aplicarParcela({ saldo: 50_000, taxaMensal: 0, parcela: 20_000 }).saldo).toBe(30_000);
  });
  it('não fica negativo', () => {
    expect(aplicarParcela({ saldo: 10_000, taxaMensal: 1, parcela: 50_000 })).toEqual({ saldo: 0, juros: 100, pago: 10_100 });
    expect(aplicarParcela({ saldo: 0, taxaMensal: 1, parcela: 50_000 }).saldo).toBe(0);
  });
});

describe('mesesRestantes', () => {
  it('sem juros', () => {
    expect(mesesRestantes({ saldo: 100_000, taxaMensal: 0, parcela: 30_000 })).toBe(4);
  });
  it('com juros pela fórmula fechada', () => {
    // saldo 10.000, 2% a.m., parcela 1.000 → −ln(1 − 0,2)/ln(1,02) = 11,27 → 12
    expect(mesesRestantes({ saldo: 1_000_000, taxaMensal: 2, parcela: 100_000 })).toBe(12);
  });
  it('confere com a simulação mês a mês', () => {
    let d = { saldo: 1_000_000, taxaMensal: 2, parcela: 100_000 };
    let n = 0;
    while (d.saldo > 0) {
      d = { ...d, saldo: aplicarParcela(d).saldo };
      n++;
    }
    expect(n).toBe(12);
  });
  it('parcela que não cobre os juros', () => {
    expect(mesesRestantes({ saldo: 1_000_000, taxaMensal: 2, parcela: 20_000 })).toBe(Infinity);
  });
  it('quitada', () => {
    expect(mesesRestantes({ saldo: 0, taxaMensal: 2, parcela: 1 })).toBe(0);
  });
  it('mês de término', () => {
    expect(mesTermino({ saldo: 100_000, taxaMensal: 0, parcela: 30_000 }, '2026-10')).toBe('2027-02');
  });
});

describe('proximoMesAplicavel', () => {
  it('um mês por vez, sem passar do corrente', () => {
    expect(proximoMesAplicavel('2026-08', '2026-10')).toBe('2026-09');
    expect(proximoMesAplicavel('2026-09', '2026-10')).toBe('2026-10');
    expect(proximoMesAplicavel('2026-10', '2026-10')).toBeNull();
    expect(proximoMesAplicavel(null, '2026-10')).toBe('2026-10');
  });
});

describe('aplicarParcelasDoMes', () => {
  it('atualiza saldos, capital, juros e gera snapshot', () => {
    const r = aplicarParcelasDoMes(
      {
        capital: 500_000,
        jurosPagos: 1_000,
        reserva: 2_000_000,
        longevidadeModo: '2/2',
        salarioBaseLongevidade: 1_000_000,
        ultimoMesAplicado: '2026-09',
      },
      [
        divida({ id: 'a', nome: 'Consignado', saldo: 1_000_000, taxaMensal: 2, parcela: 100_000 }),
        divida({ id: 'b', nome: 'Acordo', saldo: 50_000, parcela: 20_000 }),
        divida({ id: 'c', nome: 'Inativa', saldo: 50_000, parcela: 20_000, ativo: false }),
      ],
      '2026-10',
    );
    expect(r.dividas.map((d) => d.saldo)).toEqual([920_000, 30_000, 50_000]);
    expect(r.estado.capital).toBe(540_000);
    expect(r.estado.jurosPagos).toBe(21_000);
    expect(r.estado.ultimoMesAplicado).toBe('2026-10');
    expect(r.snapshot).toMatchObject({ mes: '2026-10', reserva: 2_000_000, capital: 540_000, jurosDoMes: 20_000 });
    expect(r.snapshot.dividas).toHaveLength(3);
  });
});

describe('efeitoAmortizacao', () => {
  it('reduz parcelas e juros', () => {
    const e = efeitoAmortizacao({ saldo: 1_000_000, taxaMensal: 2, parcela: 100_000 }, 300_000);
    expect(e.mesesAntes).toBe(12);
    expect(e.mesesDepois).toBe(8);
    expect(e.parcelasEvitadas).toBe(4);
    expect(e.jurosEvitados).toBeGreaterThan(0);
  });
});
