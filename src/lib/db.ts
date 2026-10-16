import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { normalizarConfig, type Config } from './config';

/** Edição salva: o JSON original fica guardado inteiro (inclusive campos que esta versão do app ignora). */
export type EdicaoSalva = { data: string; bruto: unknown; importadoEm: string };

interface RadarDB extends DBSchema {
  edicoes: { key: string; value: EdicaoSalva };
  config: { key: string; value: unknown };
}

let conexao: Promise<IDBPDatabase<RadarDB>> | null = null;

/** Datas de edições apagadas e quando (para a sincronização não trazê-las de volta). */
export type Apagadas = Record<string, string>;

// Avisos de mudança local (a sincronização escuta para enviar as alterações).
const ouvintes = new Set<() => void>();
export function aoMudar(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
const avisar = (silencioso?: boolean) => {
  if (!silencioso) ouvintes.forEach((f) => f());
};

function db() {
  conexao ??= openDB<RadarDB>('radar-investimentos', 1, {
    upgrade(d) {
      d.createObjectStore('edicoes', { keyPath: 'data' });
      d.createObjectStore('config');
    },
  });
  return conexao;
}

export async function listarEdicoes(): Promise<EdicaoSalva[]> {
  return (await db()).getAll('edicoes');
}

export async function existeEdicao(data: string): Promise<boolean> {
  return (await (await db()).getKey('edicoes', data)) !== undefined;
}

export async function salvarEdicao(e: EdicaoSalva, silencioso = false): Promise<void> {
  const d = await db();
  await d.put('edicoes', e);
  const ap = await lerApagadas();
  if (ap[e.data] && ap[e.data]! < e.importadoEm) {
    delete ap[e.data];
    await d.put('config', ap, 'apagadas');
  }
  avisar(silencioso);
}

export async function apagarEdicao(data: string, silencioso = false): Promise<void> {
  const d = await db();
  await d.delete('edicoes', data);
  if (!silencioso) await marcarApagadas([data]);
  avisar(silencioso);
}

export async function apagarTudo(): Promise<void> {
  const d = await db();
  const datas = (await d.getAllKeys('edicoes')) as string[];
  await d.clear('edicoes');
  await marcarApagadas(datas);
  avisar();
}

export async function lerApagadas(): Promise<Apagadas> {
  const v = await (await db()).get('config', 'apagadas');
  return v && typeof v === 'object' ? { ...(v as Apagadas) } : {};
}

export async function salvarApagadas(a: Apagadas): Promise<void> {
  await (await db()).put('config', a, 'apagadas');
}

async function marcarApagadas(datas: string[]) {
  const ap = await lerApagadas();
  const agora = new Date().toISOString();
  for (const d of datas) ap[d] = agora;
  await salvarApagadas(ap);
}

/** Dados guardados da sincronização (a chave do GitHub fica só neste aparelho). */
export type DadosSync = { token: string; gistId?: string; ultima?: string };

export async function lerSync(): Promise<DadosSync | null> {
  const v = (await (await db()).get('config', 'sync')) as DadosSync | undefined;
  return v?.token ? v : null;
}

export async function salvarSync(s: DadosSync | null): Promise<void> {
  const d = await db();
  if (s) await d.put('config', s, 'sync');
  else await d.delete('config', 'sync');
}

export async function lerConfig(): Promise<Config> {
  return normalizarConfig(await (await db()).get('config', 'principal'));
}

export async function salvarConfig(c: Config, silencioso = false): Promise<void> {
  await (await db()).put('config', c, 'principal');
  avisar(silencioso);
}

/** Usado nos testes para começar com um banco limpo. */
export function _resetarConexao() {
  conexao = null;
}
