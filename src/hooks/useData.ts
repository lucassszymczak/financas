import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db/db';
import { getSettings } from '../lib/db/settings';
import type { Debt, FixedItem, Settings, Transaction } from '../lib/db/schemas';

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => getSettings(), []);
}

export function useDebts(): Debt[] | undefined {
  return useLiveQuery(() => db.debts.orderBy('ordem').toArray(), []);
}

export function useFixedItems(): FixedItem[] | undefined {
  return useLiveQuery(() => db.fixedItems.toArray(), []);
}

export function useMonthTransactions(mes: string): Transaction[] | undefined {
  return useLiveQuery(() => db.transactions.where('mes').equals(mes).sortBy('data'), [mes]);
}

export function useAllTransactions(): Transaction[] | undefined {
  return useLiveQuery(() => db.transactions.toArray(), []);
}
