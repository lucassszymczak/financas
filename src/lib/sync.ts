import { normalizarConfig, type Config } from './config';
import { migrarApagadas, normalizarSalva, type Apagadas, type EdicaoSalva } from './db';

/**
 * Sincronização entre aparelhos por um Gist secreto do GitHub.
 * Cada aparelho guarda tudo localmente; ao sincronizar, junta o que tem com o que está no Gist:
 * - edições: fica a versão importada mais recentemente de cada data;
 * - edições apagadas: somem dos dois lados (a não ser que tenham sido importadas de novo depois);
 * - configurações: fica a alterada por último.
 */

export const DESCRICAO_GIST = 'Radar de Investimentos · sincronização (não apague)';
export const ARQUIVO_GIST = 'radar-sync.json';

export type PacoteSync = {
  app: 'radar-investimentos';
  tipo: 'sync';
  versao: 1;
  atualizadoEm: string;
  config: Config;
  edicoes: EdicaoSalva[];
  apagadas: Apagadas;
};

export type Lado = { config: Config; edicoes: EdicaoSalva[]; apagadas: Apagadas };

/** Assinatura simples para saber se dois lados têm o mesmo conteúdo. */
function assinatura(l: Lado): string {
  const ed = [...l.edicoes]
    .map((e) => `${e.chave}@${e.importadoEm}`)
    .sort()
    .join('|');
  const ap = Object.entries(l.apagadas)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, t]) => `${d}@${t}`)
    .join('|');
  return `${ed}#${ap}#${l.config.atualizadaEm ?? ''}`;
}

export function mesclar(local: Lado, remoto: Lado): { resultado: Lado; mudouLocal: boolean; mudouRemoto: boolean } {
  const apagadas: Apagadas = { ...remoto.apagadas };
  for (const [d, t] of Object.entries(local.apagadas)) if (!apagadas[d] || apagadas[d]! < t) apagadas[d] = t;

  const porData = new Map<string, EdicaoSalva>();
  for (const e of [...remoto.edicoes, ...local.edicoes]) {
    const atual = porData.get(e.chave);
    if (!atual || atual.importadoEm < e.importadoEm) porData.set(e.chave, e);
  }
  const edicoes = [...porData.values()]
    .filter((e) => !apagadas[e.chave] || apagadas[e.chave]! < e.importadoEm)
    .sort((a, b) => a.chave.localeCompare(b.chave));
  // Marcas de apagamento antigas que já foram superadas por uma nova importação não precisam ficar.
  for (const e of edicoes) if (apagadas[e.chave]) delete apagadas[e.chave];

  const config = (remoto.config.atualizadaEm ?? '') > (local.config.atualizadaEm ?? '') ? remoto.config : local.config;
  const resultado = { config, edicoes, apagadas };
  const r = assinatura(resultado);
  return { resultado, mudouLocal: r !== assinatura(local), mudouRemoto: r !== assinatura(remoto) };
}

export function montarPacote(l: Lado, agora = new Date()): PacoteSync {
  return { app: 'radar-investimentos', tipo: 'sync', versao: 1, atualizadoEm: agora.toISOString(), ...l };
}

export function lerPacote(texto: string): Lado {
  const p = JSON.parse(texto) as Partial<PacoteSync>;
  if (p?.app !== 'radar-investimentos' || !Array.isArray(p.edicoes))
    throw new ErroSync('O arquivo de sincronização no GitHub está corrompido.');
  return {
    config: normalizarConfig(p.config),
    // Pacotes antigos guardavam por data: cada edição vira `data#tipo` (sem tipo = manhã).
    edicoes: p.edicoes.filter((e) => e && typeof e.data === 'string' && typeof e.importadoEm === 'string').map(normalizarSalva),
    apagadas: p.apagadas && typeof p.apagadas === 'object' ? migrarApagadas(p.apagadas) : {},
  };
}

export class ErroSync extends Error {}

type Fetch = typeof fetch;

/** Cliente mínimo da API de Gists do GitHub. */
export function clienteGist(token: string, f: Fetch = fetch.bind(globalThis)) {
  const pedir = async (caminho: string, init: RequestInit = {}) => {
    let r: Response;
    try {
      r = await f(`https://api.github.com${caminho}`, {
        ...init,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    } catch {
      throw new ErroSync('Sem conexão com o GitHub. A sincronização tenta de novo quando a internet voltar.');
    }
    if (r.status === 401)
      throw new ErroSync('O GitHub não aceitou a chave. Confira se ela foi copiada inteira e se não expirou.');
    if (r.status === 403 || r.status === 404) {
      if (caminho.startsWith('/gists/')) throw new ErroSync('gist-sumiu');
      throw new ErroSync('A chave não tem permissão para Gists. Crie a chave marcando só a opção "gist".');
    }
    if (!r.ok) throw new ErroSync(`O GitHub respondeu com erro ${r.status}. Tente de novo em alguns minutos.`);
    return r.json() as Promise<Record<string, unknown>>;
  };

  type Gist = {
    id: string;
    description?: string;
    files: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>;
  };

  return {
    /** Procura o Gist do Radar entre os Gists da conta. */
    async encontrar(): Promise<string | null> {
      for (let pagina = 1; pagina <= 5; pagina++) {
        const lista = (await pedir(`/gists?per_page=100&page=${pagina}`)) as unknown as Gist[];
        const achado = lista.find((g) => g.description === DESCRICAO_GIST && g.files[ARQUIVO_GIST]);
        if (achado) return achado.id;
        if (lista.length < 100) break;
      }
      return null;
    },
    async ler(id: string): Promise<string> {
      const g = (await pedir(`/gists/${id}`)) as unknown as Gist;
      const arq = g.files[ARQUIVO_GIST];
      if (!arq) throw new ErroSync('gist-sumiu');
      if (!arq.truncated && typeof arq.content === 'string') return arq.content;
      // Arquivos grandes vêm cortados na API: baixa o conteúdo completo.
      const r = await f(arq.raw_url!);
      if (!r.ok) throw new ErroSync('Não foi possível baixar o histórico completo do GitHub.');
      return r.text();
    },
    async criar(conteudo: string): Promise<string> {
      const g = (await pedir('/gists', {
        method: 'POST',
        body: JSON.stringify({ description: DESCRICAO_GIST, public: false, files: { [ARQUIVO_GIST]: { content: conteudo } } }),
      })) as unknown as Gist;
      return g.id;
    },
    async gravar(id: string, conteudo: string): Promise<void> {
      await pedir(`/gists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ files: { [ARQUIVO_GIST]: { content: conteudo } } }),
      });
    },
  };
}
