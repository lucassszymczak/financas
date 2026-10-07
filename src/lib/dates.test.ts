import { describe, expect, it } from 'vitest';
import { addDays, addMonths, daysInMonth, diffDays, monthLabel, parseDateBR } from './dates';

describe('datas', () => {
  it('dias no mês', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-10')).toBe(31);
  });
  it('soma meses e dias', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(diffDays('2026-10-01', '2026-10-07')).toBe(6);
  });
  it('rótulo do mês', () => {
    expect(monthLabel('2026-03')).toBe('março de 2026');
  });
  it('lê datas brasileiras', () => {
    const ref = new Date(2026, 9, 7);
    expect(parseDateBR('05/10/2026', ref)).toBe('2026-10-05');
    expect(parseDateBR('05/10/26', ref)).toBe('2026-10-05');
    expect(parseDateBR('2026-10-05', ref)).toBe('2026-10-05');
    expect(parseDateBR('05/10', ref)).toBe('2026-10-05');
    expect(parseDateBR('25/12', ref)).toBe('2025-12-25');
    expect(parseDateBR('31/02/2026', ref)).toBeNull();
  });
});
