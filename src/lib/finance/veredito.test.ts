import { describe, expect, it } from 'vitest';
import { vereditoLongevidade } from './veredito';

describe('vereditoLongevidade', () => {
  it('sobe com resultado ≥ −500 e indica a janela', () => {
    const v = vereditoLongevidade({ valor: -40_000, estimativa: true, modo: '2/2', mes: '2026-10' });
    expect(v.tom).toBe('pos');
    expect(v.titulo).toContain('novembro de 2026');
    expect(v.detalhe).toContain('previsão');
  });
  it('espera abaixo de −500', () => {
    const v = vereditoLongevidade({ valor: -60_000, estimativa: false, modo: '2/2', mes: '2026-12' });
    expect(v.titulo).toBe('Esperar');
    expect(v.detalhe).toContain('junho de 2027');
  });
  it('já em 6/6', () => {
    expect(vereditoLongevidade({ valor: 0, estimativa: false, modo: '6/6', mes: '2026-10' }).titulo).toContain('já em 6/6');
  });
});
