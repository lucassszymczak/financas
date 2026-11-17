import { describe, expect, it } from 'vitest';
import { eventosEmBrasilia, paraBrasilia } from './agenda';

describe('agenda em horário de Brasília', () => {
  it('mantém eventos já em Brasília', () => {
    expect(paraBrasilia('2026-10-16', '09:00', 'America/Sao_Paulo')).toEqual({ data: '2026-10-16', hora: '09:00' });
  });
  it('converte Nova York (horário de verão dos EUA, −4h) para Brasília (−3h)', () => {
    expect(paraBrasilia('2026-10-28', '14:00', 'America/New_York')).toEqual({ data: '2026-10-28', hora: '15:00' });
  });
  it('vira o dia quando preciso (Tóquio)', () => {
    expect(paraBrasilia('2026-10-16', '08:50', 'Asia/Tokyo')).toEqual({ data: '2026-10-15', hora: '20:50' });
  });
  it('ordena por data e hora, sem hora no fim do dia', () => {
    const r = eventosEmBrasilia([
      { data: '2026-10-16', hora: null, evento: 'C' },
      { data: '2026-10-16', hora: '10:15', evento: 'B' },
      { data: '2026-10-16', hora: '09:00', evento: 'A' },
    ]);
    expect(r.map((e) => e.evento)).toEqual(['A', 'B', 'C']);
  });
});
