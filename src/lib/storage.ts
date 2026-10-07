export type PersistStatus = 'persistente' | 'nao-persistente' | 'indisponivel';

/** Pede armazenamento persistente (o navegador pode recusar). */
export async function requestPersist(): Promise<PersistStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return 'indisponivel';
  try {
    if (await navigator.storage.persisted()) return 'persistente';
    return (await navigator.storage.persist()) ? 'persistente' : 'nao-persistente';
  } catch {
    return 'indisponivel';
  }
}

export async function persistStatus(): Promise<PersistStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return 'indisponivel';
  try {
    return (await navigator.storage.persisted()) ? 'persistente' : 'nao-persistente';
  } catch {
    return 'indisponivel';
  }
}

export async function storageEstimate(): Promise<{ usado: number; cota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const e = await navigator.storage.estimate();
    return { usado: e.usage ?? 0, cota: e.quota ?? 0 };
  } catch {
    return null;
  }
}
