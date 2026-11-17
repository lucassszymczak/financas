import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Radar } from './schema/radar';
import { CONFIG_PADRAO, type Config } from './lib/config';
import * as db from './lib/db';
import { validarRadar } from './lib/validar';
import { chaveEdicao, compararEdicoes } from './lib/edicoes';
import { fundirDia } from './lib/fusao';

/** Uma edição salva (manhã, meio-dia…). */
export type Edicao = { chave: string; data: string; radar: Radar; importadoEm: string };

/** Um dia: suas edições (da mais antiga para a mais recente) e o Radar do dia completo (fusão). */
export type Dia = { data: string; edicoes: Edicao[]; radar: Radar };

/**
 * O que está na tela: o dia completo (fusão das edições) ou uma edição específica aberta no Histórico.
 * `radar` é o que as telas usam; `doDia` são as edições que entraram nele.
 */
export type Vista = {
  data: string;
  radar: Radar;
  importadoEm: string;
  /** null = dia completo; senão, a chave da edição aberta. */
  chave: string | null;
  doDia: Edicao[];
};

type Estado = {
  carregando: boolean;
  /** Todas as edições salvas, da mais recente para a mais antiga. */
  edicoes: Edicao[];
  /** Dias com edições, do mais recente para o mais antigo. */
  dias: Dia[];
  /** O que está em exibição: o dia mais recente completo, ou um dia/edição aberto no Histórico. */
  atual: Vista | null;
  /** true quando o usuário abriu um dia antigo ou uma edição específica no Histórico. */
  modoLeitura: boolean;
  /** `null` = dia mais recente; uma data = aquele dia completo; uma chave (`data#tipo`) = só aquela edição. */
  abrirEdicao: (selecao: string | null) => void;
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
      if (v.ok)
        lista.push({ chave: chaveEdicao(v.radar), data: v.radar.edicao.data, radar: v.radar, importadoEm: s.importadoEm });
    }
    lista.sort((a, b) => b.data.localeCompare(a.data) || compararEdicoes(b.radar, a.radar));
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

  const dias = useMemo<Dia[]>(() => {
    const m = new Map<string, Edicao[]>();
    for (const e of edicoes) m.set(e.data, [...(m.get(e.data) ?? []), e]);
    return [...m.entries()].map(([data, eds]) => {
      const asc = [...eds].sort((a, b) => compararEdicoes(a.radar, b.radar));
      return { data, edicoes: asc, radar: fundirDia(asc.map((e) => e.radar)) };
    });
  }, [edicoes]);

  const valor = useMemo<Estado>(() => {
    let atual: Vista | null = null;
    const especifica = selecionada?.includes('#') ? edicoes.find((e) => e.chave === selecionada) : undefined;
    if (especifica) {
      atual = {
        data: especifica.data,
        radar: especifica.radar,
        importadoEm: especifica.importadoEm,
        chave: especifica.chave,
        doDia: [especifica],
      };
    } else {
      const dia = (selecionada ? dias.find((d) => d.data === selecionada) : undefined) ?? dias[0];
      if (dia)
        atual = {
          data: dia.data,
          radar: dia.radar,
          importadoEm: dia.edicoes.at(-1)!.importadoEm,
          chave: null,
          doDia: dia.edicoes,
        };
    }
    return {
      carregando,
      edicoes,
      dias,
      atual,
      modoLeitura: !!atual && (atual.chave !== null || atual.data !== dias[0]?.data),
      abrirEdicao: setSelecionada,
      config,
      salvarConfig,
      recarregar,
    };
  }, [carregando, edicoes, dias, selecionada, config, salvarConfig, recarregar]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useEstado(): Estado {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEstado fora do EstadoProvider');
  return c;
}

/** Edição em exibição; só use em telas que aparecem quando já há dados. */
export function useRadar(): { radar: Radar; edicoes: Edicao[]; config: Config; vista: Vista } {
  const { atual, edicoes, config } = useEstado();
  if (!atual) throw new Error('Sem edição carregada');
  return { radar: atual.radar, edicoes, config, vista: atual };
}

/** "Mostrar logos e bandeiras" (ligado por padrão; fora do provider, também ligado). */
export function useMostrarLogos(): boolean {
  return useContext(Ctx)?.config.mostrarLogos ?? true;
}
