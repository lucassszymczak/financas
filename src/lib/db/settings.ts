import { db, type PlanoDB } from './db';
import { defaultSettings } from './defaults';
import type { Settings } from './schemas';

export async function getSettings(database: PlanoDB = db): Promise<Settings> {
  const s = await database.settings.get('main');
  if (s) return { ...defaultSettings(), ...s, projecao: { ...defaultSettings().projecao, ...s.projecao } };
  return defaultSettings();
}

export async function updateSettings(
  patch: Partial<Omit<Settings, 'id'>> | ((s: Settings) => Partial<Omit<Settings, 'id'>>),
  database: PlanoDB = db,
): Promise<Settings> {
  return database.transaction('rw', database.settings, async () => {
    const current = await getSettings(database);
    const p = typeof patch === 'function' ? patch(current) : patch;
    const next: Settings = { ...current, ...p, id: 'main' };
    await database.settings.put(next);
    return next;
  });
}
