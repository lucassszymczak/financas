import Dexie, { type EntityTable } from 'dexie';
import type {
  CategoryRule,
  Closing,
  CsvMapping,
  Debt,
  FixedItem,
  KeywordEntry,
  Receipt,
  Settings,
  Snapshot,
  Transaction,
} from './schemas';
import { DICIONARIO_INICIAL } from './categories';
import { stableId } from '../id';

export class PlanoDB extends Dexie {
  settings!: EntityTable<Settings, 'id'>;
  debts!: EntityTable<Debt, 'id'>;
  fixedItems!: EntityTable<FixedItem, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  receipts!: EntityTable<Receipt, 'id'>;
  categoryRules!: EntityTable<CategoryRule, 'chave'>;
  keywordDictionary!: EntityTable<KeywordEntry, 'id'>;
  csvMappings!: EntityTable<CsvMapping, 'banco'>;
  closings!: EntityTable<Closing, 'mes'>;
  snapshots!: EntityTable<Snapshot, 'mes'>;

  constructor(name = 'plano-patrimonial') {
    super(name);
    this.version(1).stores({
      settings: 'id',
      debts: 'id, ordem',
      fixedItems: 'id, tipo',
      transactions: 'id, mes, data, tipo, fixoId, comprovanteId, dedutivel, [mes+tipo]',
      receipts: 'id',
      categoryRules: 'chave, atualizadoEm',
      keywordDictionary: 'id, palavra',
      csvMappings: 'banco',
      closings: 'mes',
      snapshots: 'mes',
    });
    this.on('populate', (tx) => {
      tx.table('keywordDictionary').bulkAdd(
        DICIONARIO_INICIAL.map((e) => ({ ...e, id: stableId('kw', `${e.palavra}|${e.tipo}|${e.categoria}`) })),
      );
    });
  }
}

export const db = new PlanoDB();
