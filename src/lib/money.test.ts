import { describe, expect, it } from 'vitest';
import { formatBRL, formatBRLSigned, formatDecimalBR, parseMoney } from './money';

describe('parseMoney', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1234.56', 123456],
    ['1,234.56', 123456],
    ['R$ 87', 8700],
    ['R$87,90', 8790],
    ['42,5', 4250],
    ['-12,30', -1230],
    ['12,30-', -1230],
    ['(12,30)', -1230],
    ['1.234', 123400],
    ['12.5', 1250],
    ['1.234.567,89', 123456789],
    ['+10', 1000],
  ])('%s → %i', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(['', 'abc', 'R$', '-'])('rejeita %j', (input) => {
    expect(parseMoney(input)).toBeNull();
  });
});

describe('formatação', () => {
  it('formata em reais', () => {
    expect(formatBRL(123456)).toBe('R$ 1.234,56');
    expect(formatBRL(-500)).toBe('-R$ 5,00');
    expect(formatBRL(123456, { semCentavos: true })).toBe('R$ 1.235');
  });
  it('formata com sinal', () => {
    expect(formatBRLSigned(1000)).toBe('+R$ 10,00');
    expect(formatBRLSigned(-1000)).toBe('−R$ 10,00');
    expect(formatBRLSigned(0)).toBe('R$ 0,00');
  });
  it('formata decimal brasileiro sem milhar', () => {
    expect(formatDecimalBR(123456)).toBe('1234,56');
  });
});
