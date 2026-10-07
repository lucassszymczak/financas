import JSZip from 'jszip';
import { z } from 'zod';
import type { PlanoDB } from '../db/db';
import {
  categoryRuleSchema,
  closingSchema,
  csvMappingSchema,
  debtSchema,
  fixedItemSchema,
  keywordEntrySchema,
  receiptMetaSchema,
  settingsSchema,
  snapshotSchema,
  transactionSchema,
} from '../db/schemas';
import { getSettings, updateSettings } from '../db/settings';
import { todayISO } from '../dates';

export const BACKUP_VERSAO = 1;

export const dadosSchema = z.object({
  app: z.literal('plano-patrimonial'),
  versao: z.number().int(),
  criadoEm: z.string(),
  settings: settingsSchema.nullable(),
  debts: z.array(debtSchema),
  fixedItems: z.array(fixedItemSchema),
  transactions: z.array(transactionSchema),
  receipts: z.array(receiptMetaSchema),
  categoryRules: z.array(categoryRuleSchema),
  keywordDictionary: z.array(keywordEntrySchema),
  csvMappings: z.array(csvMappingSchema),
  closings: z.array(closingSchema),
  snapshots: z.array(snapshotSchema),
});

export type DadosBackup = z.infer<typeof dadosSchema>;
export type BackupLido = { dados: DadosBackup; arquivos: Map<string, Blob> };

function extensao(tipo: string): string {
  if (tipo === 'image/png') return 'png';
  if (tipo === 'application/pdf') return 'pdf';
  return 'jpg';
}

export function nomeArquivoBackup(now = new Date()): string {
  return `plano-backup-${todayISO(now)}.zip`;
}

/** Gera o ZIP com dados.json e a pasta comprovantes/. */
export async function gerarBackup(database: PlanoDB, now = new Date()): Promise<Blob> {
  const zip = new JSZip();
  const receipts = await database.receipts.toArray();
  const settings = await database.settings.get('main');
  const dados: DadosBackup = {
    app: 'plano-patrimonial',
    versao: BACKUP_VERSAO,
    criadoEm: now.toISOString(),
    settings: settings ? { ...settings, ultimoBackup: now.toISOString() } : null,
    debts: await database.debts.toArray(),
    fixedItems: await database.fixedItems.toArray(),
    transactions: await database.transactions.toArray(),
    receipts: receipts.map((r) => ({ id: r.id, criadoEm: r.criadoEm, tipoArquivo: r.tipoArquivo ?? 'image/jpeg' })),
    categoryRules: await database.categoryRules.toArray(),
    keywordDictionary: await database.keywordDictionary.toArray(),
    csvMappings: await database.csvMappings.toArray(),
    closings: await database.closings.toArray(),
    snapshots: await database.snapshots.toArray(),
  };
  zip.file('dados.json', JSON.stringify(dados, null, 1));
  const pasta = zip.folder('comprovantes')!;
  for (const r of receipts) {
    pasta.file(`${r.id}.${extensao(r.tipoArquivo ?? 'image/jpeg')}`, new Uint8Array(await r.blob.arrayBuffer()));
  }
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return new Blob([bytes as BlobPart], { type: 'application/zip' });
}

/** Lê e valida um ZIP de backup. Lança erro com mensagem em português se for inválido. */
export async function lerBackup(arquivo: Blob): Promise<BackupLido> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await arquivo.arrayBuffer());
  } catch {
    throw new Error('O arquivo não é um ZIP válido.');
  }
  const json = zip.file('dados.json');
  if (!json) throw new Error('O backup não tem o arquivo dados.json.');
  let bruto: unknown;
  try {
    bruto = JSON.parse(await json.async('string'));
  } catch {
    throw new Error('O dados.json está corrompido.');
  }
  const parsed = dadosSchema.safeParse(bruto);
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    throw new Error(`Backup inválido${p ? ` (${p.path.join('.')}: ${p.message})` : ''}.`);
  }
  const arquivos = new Map<string, Blob>();
  for (const meta of parsed.data.receipts) {
    const f = zip.file(`comprovantes/${meta.id}.${extensao(meta.tipoArquivo)}`);
    if (f) arquivos.set(meta.id, new Blob([(await f.async('uint8array')) as BlobPart], { type: meta.tipoArquivo }));
  }
  return { dados: parsed.data, arquivos };
}

export type ResumoBackup = {
  criadoEm: string;
  lancamentos: number;
  comprovantes: number;
  dividas: number;
  fixos: number;
  meses: number;
};

export function resumirBackup(b: BackupLido): ResumoBackup {
  return {
    criadoEm: b.dados.criadoEm,
    lancamentos: b.dados.transactions.length,
    comprovantes: b.arquivos.size,
    dividas: b.dados.debts.length,
    fixos: b.dados.fixedItems.length,
    meses: new Set(b.dados.transactions.map((t) => t.mes)).size,
  };
}

export type ModoRestauro = 'substituir' | 'mesclar';

const TABELAS = [
  'debts',
  'fixedItems',
  'transactions',
  'categoryRules',
  'keywordDictionary',
  'csvMappings',
  'closings',
  'snapshots',
] as const;

/**
 * Restaura um backup.
 * - substituir: apaga tudo e grava o backup.
 * - mesclar: acrescenta só os registros cujo id ainda não existe (idempotente).
 *   A configuração local é mantida, exceto se ainda não existir.
 */
export async function restaurarBackup(database: PlanoDB, b: BackupLido, modo: ModoRestauro, now = new Date()): Promise<void> {
  const { dados, arquivos } = b;
  const receipts = dados.receipts.filter((m) => arquivos.has(m.id)).map((m) => ({ ...m, blob: arquivos.get(m.id)! }));

  await database.transaction('rw', database.tables, async () => {
    if (modo === 'substituir') {
      await Promise.all(database.tables.map((t) => t.clear()));
      if (dados.settings) await database.settings.put(dados.settings);
      for (const nome of TABELAS) await database.table(nome).bulkPut(dados[nome] as never[]);
      await database.receipts.bulkPut(receipts);
    } else {
      if (dados.settings && !(await database.settings.get('main'))) await database.settings.put(dados.settings);
      for (const nome of TABELAS) {
        const tabela = database.table(nome);
        const registros = dados[nome] as Record<string, unknown>[];
        const chave = tabela.schema.primKey.keyPath as string;
        const existentes = new Set((await tabela.toCollection().primaryKeys()).map(String));
        await tabela.bulkAdd(registros.filter((r) => !existentes.has(String(r[chave]))) as never[]);
      }
      const existentes = new Set((await database.receipts.toCollection().primaryKeys()).map(String));
      await database.receipts.bulkAdd(receipts.filter((r) => !existentes.has(r.id)));
    }
    await updateSettings({ ultimoRestauro: now.toISOString() }, database);
  });
}

export async function marcarBackupFeito(database: PlanoDB, now = new Date()): Promise<void> {
  await updateSettings({ ultimoBackup: now.toISOString() }, database);
}

/** Dias desde o último backup (null se nunca). */
export function diasDesdeBackup(ultimoBackup: string | null, now = new Date()): number | null {
  if (!ultimoBackup) return null;
  return Math.floor((now.getTime() - new Date(ultimoBackup).getTime()) / 86_400_000);
}

/** Existe algum dado que valha proteger? */
export async function temDados(database: PlanoDB): Promise<boolean> {
  const [t, d, s] = await Promise.all([database.transactions.count(), database.debts.count(), getSettings(database)]);
  return t > 0 || d > 0 || s.reserva !== 0 || s.capital !== 0;
}
