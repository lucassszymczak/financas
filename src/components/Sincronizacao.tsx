import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useEstado } from '../state';
import * as db from '../lib/db';
import { clienteGist, ErroSync, lerPacote, mesclar, montarPacote, type Lado } from '../lib/sync';
import { abrirCodigo, criarCodigo, gerarSenha } from '../lib/pareamento';

export type StatusSync =
  | { estado: 'desligada' }
  | { estado: 'ociosa'; ultima?: string }
  | { estado: 'sincronizando'; ultima?: string }
  | { estado: 'erro'; mensagem: string; ultima?: string };

type Api = {
  status: StatusSync;
  ligar: (token: string) => Promise<void>;
  /** Conecta este aparelho com o código gerado em outro (sem pedir a chave do GitHub). */
  ligarComCodigo: (codigo: string, senha: string) => Promise<void>;
  /** Gera um código + senha para conectar outro aparelho a esta sincronização. */
  gerarConvite: () => Promise<{ codigo: string; senha: string }>;
  desligar: () => Promise<void>;
  sincronizarAgora: () => Promise<void>;
};

const Ctx = createContext<Api | null>(null);

async function ladoLocal(): Promise<Lado> {
  const [edicoes, apagadas, config] = await Promise.all([db.listarEdicoes(), db.lerApagadas(), db.lerConfig()]);
  return { edicoes, apagadas, config };
}

/** Grava no aparelho o resultado da mescla, sem disparar uma nova sincronização. */
async function aplicarLocal(local: Lado, resultado: Lado) {
  const manter = new Set(resultado.edicoes.map((e) => e.data));
  for (const e of local.edicoes) if (!manter.has(e.data)) await db.apagarEdicao(e.data, true);
  const atuais = new Map(local.edicoes.map((e) => [e.data, e.importadoEm]));
  for (const e of resultado.edicoes) if (atuais.get(e.data) !== e.importadoEm) await db.salvarEdicao(e, true);
  await db.salvarApagadas(resultado.apagadas);
  if (resultado.config.atualizadaEm !== local.config.atualizadaEm) await db.salvarConfig(resultado.config, true);
}

/**
 * Sincronização automática: ao abrir o app, ao voltar para ele, ao reconectar
 * e alguns segundos depois de qualquer mudança local.
 */
export function SincronizacaoProvider({ children }: { children: ReactNode }) {
  const { recarregar } = useEstado();
  const [status, setStatus] = useState<StatusSync>({ estado: 'desligada' });
  const rodando = useRef<Promise<void> | null>(null);
  const deNovo = useRef(false);

  const executar = useCallback(async (): Promise<void> => {
    const dados = await db.lerSync();
    if (!dados) {
      setStatus({ estado: 'desligada' });
      return;
    }
    setStatus({ estado: 'sincronizando', ultima: dados.ultima });
    const gh = clienteGist(dados.token);
    try {
      const local = await ladoLocal();
      let gistId = dados.gistId ?? (await gh.encontrar());
      let remoto: Lado | null = null;
      if (gistId) {
        try {
          remoto = lerPacote(await gh.ler(gistId));
        } catch (e) {
          // O Gist foi apagado no GitHub: cria outro a partir deste aparelho.
          if (e instanceof ErroSync && e.message === 'gist-sumiu') gistId = null;
          else throw e;
        }
      }
      if (!gistId) {
        gistId = await gh.criar(JSON.stringify(montarPacote(local)));
      } else if (remoto) {
        const { resultado, mudouLocal, mudouRemoto } = mesclar(local, remoto);
        if (mudouLocal) {
          await aplicarLocal(local, resultado);
          await recarregar();
        }
        if (mudouRemoto) await gh.gravar(gistId, JSON.stringify(montarPacote(resultado)));
      }
      const ultima = new Date().toISOString();
      await db.salvarSync({ ...dados, gistId, ultima });
      setStatus({ estado: 'ociosa', ultima });
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : 'Erro desconhecido na sincronização.';
      setStatus({ estado: 'erro', mensagem, ultima: dados.ultima });
    }
  }, [recarregar]);

  /** Garante uma sincronização por vez; pedidos durante uma execução geram uma única repetição. */
  const sincronizarAgora = useCallback(async () => {
    if (rodando.current) {
      deNovo.current = true;
      return rodando.current;
    }
    rodando.current = (async () => {
      do {
        deNovo.current = false;
        await executar();
      } while (deNovo.current);
    })().finally(() => {
      rodando.current = null;
    });
    return rodando.current;
  }, [executar]);

  useEffect(() => {
    void db.lerSync().then((d) => {
      if (d) {
        setStatus({ estado: 'ociosa', ultima: d.ultima });
        void sincronizarAgora();
      }
    });
    let espera: ReturnType<typeof setTimeout> | undefined;
    const desliga = db.aoMudar(() => {
      clearTimeout(espera);
      espera = setTimeout(() => void db.lerSync().then((d) => d && sincronizarAgora()), 2000);
    });
    const voltou = () => {
      if (document.visibilityState === 'visible') void db.lerSync().then((d) => d && sincronizarAgora());
    };
    window.addEventListener('online', voltou);
    document.addEventListener('visibilitychange', voltou);
    return () => {
      desliga();
      clearTimeout(espera);
      window.removeEventListener('online', voltou);
      document.removeEventListener('visibilitychange', voltou);
    };
  }, [sincronizarAgora]);

  const ligar = useCallback(
    async (token: string) => {
      await db.salvarSync({ token: token.trim() });
      await sincronizarAgora();
    },
    [sincronizarAgora],
  );

  const ligarComCodigo = useCallback(
    async (codigo: string, senha: string) => {
      const { token, gistId } = await abrirCodigo(codigo, senha);
      await db.salvarSync({ token, gistId });
      await sincronizarAgora();
    },
    [sincronizarAgora],
  );

  const gerarConvite = useCallback(async () => {
    let dados = await db.lerSync();
    // O código leva o Gist junto: garante que ele já exista.
    if (dados && !dados.gistId) {
      await sincronizarAgora();
      dados = await db.lerSync();
    }
    if (!dados?.gistId) throw new ErroSync('Sincronize este aparelho uma vez antes de gerar o código.');
    const senha = gerarSenha();
    return { codigo: await criarCodigo({ token: dados.token, gistId: dados.gistId }, senha), senha };
  }, [sincronizarAgora]);

  const desligar = useCallback(async () => {
    await db.salvarSync(null);
    setStatus({ estado: 'desligada' });
  }, []);

  return (
    <Ctx.Provider value={{ status, ligar, ligarComCodigo, gerarConvite, desligar, sincronizarAgora }}>{children}</Ctx.Provider>
  );
}

export function useSincronizacao(): Api {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSincronizacao fora do SincronizacaoProvider');
  return c;
}
