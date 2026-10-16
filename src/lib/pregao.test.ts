import { describe, expect, it } from 'vitest';
import { dadoAntigo, ultimoPregaoEsperado } from './pregao';

describe('último pregão esperado', () => {
  it('na sexta, olha a quinta', () => expect(ultimoPregaoEsperado('2026-10-16')).toBe('2026-10-15'));
  it('na segunda, olha a sexta', () => expect(ultimoPregaoEsperado('2026-10-19')).toBe('2026-10-16'));
  it('no domingo, olha a sexta', () => expect(ultimoPregaoEsperado('2026-10-18')).toBe('2026-10-16'));
  it('na terça, olha a segunda', () => expect(ultimoPregaoEsperado('2026-10-20')).toBe('2026-10-19'));
  it('atravessa a virada do mês', () => expect(ultimoPregaoEsperado('2026-11-02')).toBe('2026-10-30'));
});

describe('regra de dado antigo', () => {
  it('dado do último pregão não é antigo', () => {
    expect(dadoAntigo({ data_ref: '2026-10-15' }, '2026-10-16')).toBe(false);
  });
  it('dado do mesmo dia da edição não é antigo', () => {
    expect(dadoAntigo({ data_ref: '2026-10-16' }, '2026-10-16')).toBe(false);
  });
  it('dado anterior ao último pregão é antigo', () => {
    expect(dadoAntigo({ data_ref: '2026-10-14' }, '2026-10-16')).toBe(true);
  });
  it('segunda-feira com dado de sexta não é antigo', () => {
    expect(dadoAntigo({ data_ref: '2026-10-16' }, '2026-10-19')).toBe(false);
  });
  it('segunda-feira com dado de quinta é antigo', () => {
    expect(dadoAntigo({ data_ref: '2026-10-15' }, '2026-10-19')).toBe(true);
  });
  it('itens semanais (com período) nunca são antigos', () => {
    expect(dadoAntigo({ data_ref: '2026-10-09', periodo: '05 a 09/10' }, '2026-10-16')).toBe(false);
  });
  it('sem data de referência, não marca', () => {
    expect(dadoAntigo({ data_ref: null }, '2026-10-16')).toBe(false);
  });
});
