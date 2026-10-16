import { CONFIG_PADRAO, normalizarConfig, type Config } from './config';
import type { EdicaoSalva } from './db';
import { validarRadar, validarTexto } from './validar';
import type { Radar } from '../schema/radar';

export type ArquivoLido = { nome: string; ok: true; radar: Radar; bruto: unknown } | { nome: string; ok: false; erros: string[] };

/** Lê e valida um arquivo do Radar. */
export async function lerArquivo(arquivo: { name: string; text(): Promise<string> }): Promise<ArquivoLido> {
  const texto = await arquivo.text();
  const r = validarTexto(texto);
  if (r.ok) return { nome: arquivo.name, ok: true, radar: r.radar, bruto: r.bruto };
  return { nome: arquivo.name, ok: false, erros: r.erros };
}

export type Backup = {
  app: 'radar-investimentos';
  versao: 1;
  exportadoEm: string;
  config: Config;
  edicoes: EdicaoSalva[];
};

export function montarBackup(edicoes: EdicaoSalva[], config: Config, agora = new Date()): Backup {
  return {
    app: 'radar-investimentos',
    versao: 1,
    exportadoEm: agora.toISOString(),
    config,
    edicoes: [...edicoes].sort((a, b) => a.data.localeCompare(b.data)),
  };
}

export type BackupLido = { config: Config; edicoes: EdicaoSalva[]; invalidas: string[] };

/** Valida um backup: edições inválidas são listadas e deixadas de fora, sem derrubar o restante. */
export function lerBackup(texto: string): { ok: true; backup: BackupLido } | { ok: false; erro: string } {
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    return { ok: false, erro: 'O arquivo não é um JSON válido.' };
  }
  const b = dados as Partial<Backup> | null;
  if (!b || b.app !== 'radar-investimentos' || !Array.isArray(b.edicoes)) {
    return {
      ok: false,
      erro: 'Este arquivo não é um backup do Radar. Para carregar o arquivo do dia, use "Carregar Radar do dia".',
    };
  }
  const edicoes: EdicaoSalva[] = [];
  const invalidas: string[] = [];
  for (const e of b.edicoes) {
    const v = validarRadar(e?.bruto);
    if (v.ok) edicoes.push({ data: v.radar.edicao.data, bruto: e.bruto, importadoEm: e.importadoEm ?? new Date().toISOString() });
    else invalidas.push(`${e?.data ?? '?'}: ${v.erros[0]}`);
  }
  return { ok: true, backup: { config: b.config ? normalizarConfig(b.config) : CONFIG_PADRAO, edicoes, invalidas } };
}

export function baixarArquivo(nome: string, conteudo: string, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
