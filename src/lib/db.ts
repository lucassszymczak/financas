import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { normalizarConfig, type Config } from './config';

/** Edição salva: o JSON original fica guardado inteiro (inclusive campos que esta versão do app ignora). */
export type EdicaoSalva = { data: string; bruto: unknown; importadoEm: string };

interface RadarDB extends DBSchema {
  edicoes: { key: string; value: EdicaoSalva };
  config: { key: string; value: unknown };
}

let conexao: Promise<IDBPDatabase<RadarDB>> | null = null;

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

export async function salvarEdicao(e: EdicaoSalva): Promise<void> {
  await (await db()).put('edicoes', e);
}

export async function apagarEdicao(data: string): Promise<void> {
  await (await db()).delete('edicoes', data);
}

export async function apagarTudo(): Promise<void> {
  const d = await db();
  await d.clear('edicoes');
}

export async function lerConfig(): Promise<Config> {
  return normalizarConfig(await (await db()).get('config', 'principal'));
}

export async function salvarConfig(c: Config): Promise<void> {
  await (await db()).put('config', c, 'principal');
}

/** Usado nos testes para começar com um banco limpo. */
export function _resetarConexao() {
  conexao = null;
}
