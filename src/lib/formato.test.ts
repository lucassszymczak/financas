import { describe, expect, it } from 'vitest';
import { bandeira, diaMes, hojeISO, lerNumero, numero, pct, reais, valorComUnidade, variacao } from './formato';

describe('formatação pt-BR', () => {
  it('números, reais e percentuais', () => {
    expect(numero(1234.56)).toBe('1.234,56');
    expect(reais(5.09)).toBe('R$ 5,09');
    expect(pct(12.73)).toBe('12,73%');
    expect(numero(null)).toBe('—');
  });
  it('valor com unidade', () => {
    expect(valorComUnidade(204324.26, 'pts')).toBe('204.324,26 pts');
    expect(valorComUnidade(5.087, 'R$')).toBe('R$ 5,087');
    expect(valorComUnidade(12.73, '% a.a.')).toBe('12,73% a.a.');
    expect(valorComUnidade(154.7, 'R$/sc 60 kg')).toBe('R$ 154,70/sc 60 kg');
    expect(valorComUnidade(null, 'R$')).toBe('—');
  });
  it('variação em % e em pb', () => {
    expect(variacao({ variacao_pct: -1.06 })).toEqual({ texto: '−1,06%', dir: 'baixa', seta: '▼' });
    expect(variacao({ variacao_pb: 25 })?.texto).toBe('+25 pb');
    expect(variacao({ variacao_pb: 4.2 })?.texto).toBe('+4,2 pb');
    expect(variacao({ variacao_pct: 0 })?.dir).toBe('estavel');
    expect(variacao({ variacao_pct: null })).toBeNull();
  });
  it('variação: sinal, seta e casas decimais', () => {
    expect(variacao({ variacao_pct: 2.5 })).toEqual({ texto: '+2,50%', dir: 'alta', seta: '▲' });
    expect(variacao({ variacao_pct: -12.345 })?.texto).toBe('−12,35%');
    expect(variacao({ variacao_pct: 1234.5 })?.texto).toBe('+1.234,50%');
    expect(variacao({ variacao_pb: -7 })).toEqual({ texto: '−7 pb', dir: 'baixa', seta: '▼' });
    expect(variacao({ variacao_pb: 0 })).toEqual({ texto: '0 pb', dir: 'estavel', seta: '■' });
    // Juros: pb tem prioridade sobre %.
    expect(variacao({ variacao_pct: 0.4, variacao_pb: 5 })?.texto).toBe('+5 pb');
    expect(variacao({ variacao_pct: Number.NaN })).toBeNull();
  });
  it('datas no fuso de Brasília', () => {
    expect(diaMes('2026-10-16')).toBe('16/10');
    expect(hojeISO(new Date('2026-10-17T01:30:00Z'))).toBe('2026-10-16');
  });
  it('lê números digitados', () => {
    expect(lerNumero('1.234,56')).toBe(1234.56);
    expect(lerNumero('12,5%')).toBe(12.5);
    expect(lerNumero('100.5')).toBe(100.5);
    expect(lerNumero('')).toBeNull();
    expect(lerNumero('abc')).toBeNull();
  });
  it('bandeiras', () => {
    expect(bandeira('BR')).toBe('🇧🇷');
    expect(bandeira('us')).toBe('🇺🇸');
    expect(bandeira(null)).toBe('🌐');
  });
});
