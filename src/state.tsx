import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Radar } from './schema/radar';
import { CONFIG_PADRAO, type Config } from './lib/config';
import * as db from './lib/db';
import { validarRadar } from './lib/validar';

export type Edicao = { data: string; radar: Radar; importadoEm: string };

type Estado = {
  carregando: boolean;
  /** Todas as edições salvas, da mais recente para a mais antiga. */
  edicoes: Edicao[];
  /** Edição em exibição (a mais recente ou uma aberta no Histórico). */
  atual: Edicao | null;
  /** true quando o usuário abriu uma edição antiga no Histórico. */
  modoLeitura: boolean;
  abrirEdicao: (data: string | null) => void;
  config: Config;
  salvarConfig: (c: Config) => Promise<void>;
  recarregar: () => Promise<void>;
};

const Ctx = createContext<Estado | null>(null);

export function EstadoProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [edicoes, setEdicoes] = useState<Edicao[]>([]);
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO);
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    const salvas = await db.listarEdicoes();
    const lista: Edicao[] = [];
    for (const s of salvas) {
      const v = validarRadar(s.bruto);
      if (v.ok) lista.push({ data: s.data, radar: v.radar, importadoEm: s.importadoEm });
    }
    lista.sort((a, b) => b.data.localeCompare(a.data));
    setEdicoes(lista);
    setConfig(await db.lerConfig());
  }, []);

  useEffect(() => {
    recarregar()
      .catch((e) => console.error('Falha ao abrir o banco local', e))
      .finally(() => setCarregando(false));
  }, [recarregar]);

  const salvarConfig = useCallback(async (c: Config) => {
    const nova = { ...c, atualizadaEm: new Date().toISOString() };
    setConfig(nova);
    await db.salvarConfig(nova);
  }, []);

  const valor = useMemo<Estado>(() => {
    const escolhida = selecionada ? edicoes.find((e) => e.data === selecionada) : undefined;
    const atual = escolhida ?? edicoes[0] ?? null;
    return {
      carregando,
      edicoes,
      atual,
      modoLeitura: !!escolhida && escolhida !== edicoes[0],
      abrirEdicao: setSelecionada,
      config,
      salvarConfig,
      recarregar,
    };
  }, [carregando, edicoes, selecionada, config, salvarConfig, recarregar]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useEstado(): Estado {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEstado fora do EstadoProvider');
  return c;
}

/** Edição em exibição; só use em telas que aparecem quando já há dados. */
export function useRadar(): { radar: Radar; edicoes: Edicao[]; config: Config } {
  const { atual, edicoes, config } = useEstado();
  if (!atual) throw new Error('Sem edição carregada');
  return { radar: atual.radar, edicoes, config };
}
