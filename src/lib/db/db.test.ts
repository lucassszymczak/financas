import { describe, expect, it } from 'vitest';
import { PlanoDB } from './db';
import { getSettings, updateSettings } from './settings';

describe('banco', () => {
  it('cria o dicionário inicial e configuração padrão zerada', async () => {
    const database = new PlanoDB('teste-db-1');
    const kws = await database.keywordDictionary.toArray();
    expect(kws.length).toBeGreaterThan(30);
    expect(kws.find((k) => k.palavra === 'hotel')?.tipo).toBe('trabalho');
    const s = await getSettings(database);
    expect(s.reserva).toBe(0);
    expect(s.projecao.pisoReserva).toBe(1_500_000);
    await database.delete();
  });

  it('atualiza configuração', async () => {
    const database = new PlanoDB('teste-db-2');
    await updateSettings({ reserva: 100 }, database);
    await updateSettings((s) => ({ reserva: s.reserva + 50 }), database);
    expect((await getSettings(database)).reserva).toBe(150);
    await database.delete();
  });
});
