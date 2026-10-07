import { describe, expect, it } from 'vitest';
import { sugerirAlocacao } from './extraordinarios';

const total = (a: { destino: string; valor: number }[], d: string) =>
  a.filter((x) => x.destino === d).reduce((s, x) => s + x.valor, 0);

describe('sugerirAlocacao', () => {
  it('completa a reserva até 15 mil e amortiza o consignado', () => {
    const a = sugerirAlocacao(1_000_000, { reserva: 1_200_000, consignado: 5_000_000, cdc: 3_000_000 });
    expect(total(a, 'reserva')).toBe(300_000);
    expect(total(a, 'consignado')).toBe(700_000);
    expect(total(a, 'uso_livre')).toBe(0);
  });

  it('quitando o consignado, o restante segue 30/70', () => {
    const a = sugerirAlocacao(1_000_000, { reserva: 1_500_000, consignado: 200_000, cdc: 3_000_000 });
    expect(total(a, 'consignado')).toBe(200_000);
    expect(total(a, 'uso_livre')).toBe(240_000);
    expect(total(a, 'reserva')).toBe(560_000);
  });

  it('com reserva em 30 mil, os 70% vão para o CDC e a sobra para a reserva', () => {
    const a = sugerirAlocacao(1_000_000, { reserva: 3_000_000, consignado: 0, cdc: 500_000 });
    expect(total(a, 'uso_livre')).toBe(300_000);
    expect(total(a, 'cdc')).toBe(500_000);
    expect(total(a, 'reserva')).toBe(200_000);
  });

  it('soma das alocações é igual ao valor', () => {
    for (const v of [1, 99, 123_457, 10_000_000]) {
      const a = sugerirAlocacao(v, { reserva: 1_000_000, consignado: 50_000, cdc: 70_000 });
      expect(a.reduce((s, x) => s + x.valor, 0)).toBe(v);
    }
  });
});
