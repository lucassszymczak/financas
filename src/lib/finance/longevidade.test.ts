import { describe, expect, it } from 'vitest';
import { contribuicaoMensal, custoExtraSubir, custoParticipante, proximaJanela, regraLongevidade } from './longevidade';

describe('Longevidade', () => {
  it('regra do −500', () => {
    expect(regraLongevidade(-50_000)).toBe('subir');
    expect(regraLongevidade(0)).toBe('subir');
    expect(regraLongevidade(-50_001)).toBe('esperar');
  });
  it('próxima janela em junho ou novembro', () => {
    expect(proximaJanela('2026-10')).toBe('2026-11');
    expect(proximaJanela('2026-11')).toBe('2026-11');
    expect(proximaJanela('2026-12')).toBe('2027-06');
    expect(proximaJanela('2027-06')).toBe('2027-06');
  });
  it('contribuições', () => {
    expect(contribuicaoMensal('2/2', 1_000_000)).toBe(40_000);
    expect(contribuicaoMensal('6/6', 1_000_000)).toBe(120_000);
    expect(custoParticipante('6/6', 1_000_000)).toBe(60_000);
    expect(custoExtraSubir(1_000_000)).toBe(40_000);
  });
});
