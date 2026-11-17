import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { normalizarConfig, type Config } from './config';
import { chaveMigrada, TIPO_MANHA } from './edicoes';

/**
 * Edição salva: o JSON original fica guardado inteiro (inclusive campos que esta versão do app ignora).
 * `chave` = `data#tipo` (ex.: `2026-10-21#manha`), para o dia poder ter manhã e meio-dia.
 */
export type EdicaoSalva = { chave: string; data: string; bruto: unknown; importadoEm: string };

/** Chave de uma edição a partir do JSON bruto (sem validar): mesma regra de `chaveEdicao`. */
export function chaveDoBruto(bruto: unknown, data: string): string {
  const ed = (bruto as { edicao?: { tipo?: unknown; gerado_em?: unknown } } | null)?.edicao;
  const tipo = typeof ed?.tipo === 'string' && ed.tipo.trim() ? ed.tipo.trim() : TIPO_MANHA;
  const base = `${data}#${tipo}`;
  return tipo === TIPO_MANHA || tipo === 'atualizacao_meio_dia'
    ? base
    : `${base}@${typeof ed?.gerado_em === 'string' ? ed.gerado_em : ''}`;
}

/** Edição de um backup ou pacote antigo (sem `chave`) no formato novo. */
export function normalizarSalva(e: { chave?: string; data: string; bruto: unknown; importadoEm: string }): EdicaoSalva {
  return { chave: e.chave ?? chaveDoBruto(e.bruto, e.data), data: e.data, bruto: e.bruto, importadoEm: e.importadoEm };
}

interface RadarDB extends DBSchema {
  edicoes: { key: string; value: EdicaoSalva };
  config: { key: string; value: unknown };
}

let conexao: Promise<IDBPDatabase<RadarDB>> | null = null;

/** Chaves de edições apagadas e quando (para a sincronização não trazê-las de volta). */
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

/** Apagadas antigas eram por data: viram a edição da manhã. */
export function migrarApagadas(a: Apagadas): Apagadas {
  const r: Apagadas = {};
  for (const [k, t] of Object.entries(a)) r[chaveMigrada(k)] = t;
  return r;
}

function db() {
  conexao ??= openDB<RadarDB>('radar-investimentos', 2, {
    async upgrade(d, versaoAntiga, _nova, tx) {
      if (versaoAntiga < 1) {
        d.createObjectStore('edicoes', { keyPath: 'chave' });
        d.createObjectStore('config');
        return;
      }
      if (versaoAntiga < 2) {
        // v1 guardava por data. Cada edição antiga vira `data#manha`, sem perder nada.
        const antigas = (await tx.objectStore('edicoes').getAll()) as unknown as Omit<EdicaoSalva, 'chave'>[];
        const ap = await tx.objectStore('config').get('apagadas');
        d.deleteObjectStore('edicoes');
        const nova = d.createObjectStore('edicoes', { keyPath: 'chave' });
        for (const e of antigas) await nova.put(normalizarSalva(e));
        if (ap && typeof ap === 'object') await tx.objectStore('config').put(migrarApagadas(ap as Apagadas), 'apagadas');
      }
    },
  });
  return conexao;
}

export async function listarEdicoes(): Promise<EdicaoSalva[]> {
  return (await db()).getAll('edicoes');
}

export async function existeEdicao(chave: string): Promise<boolean> {
  return (await (await db()).getKey('edicoes', chave)) !== undefined;
}

export async function salvarEdicao(e: EdicaoSalva, silencioso = false): Promise<void> {
  const d = await db();
  await d.put('edicoes', e);
  const ap = await lerApagadas();
  if (ap[e.chave] && ap[e.chave]! < e.importadoEm) {
    delete ap[e.chave];
    await d.put('config', ap, 'apagadas');
  }
  avisar(silencioso);
}

export async function apagarEdicao(chave: string, silencioso = false): Promise<void> {
  const d = await db();
  await d.delete('edicoes', chave);
  if (!silencioso) await marcarApagadas([chave]);
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
  return v && typeof v === 'object' ? migrarApagadas(v as Apagadas) : {};
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
