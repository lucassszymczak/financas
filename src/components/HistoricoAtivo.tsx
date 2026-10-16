import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useEstado } from '../state';
import { mapaPrecos, serie } from '../lib/precos';
import { dataCurta, valorComUnidade } from '../lib/formato';
import { Grafico } from './Grafico';
import { Leitura, Variacao } from './Basicos';

const Ctx = createContext<(id: string) => void>(() => {});

/** Painel com o histórico de um ativo (aberto ao clicar em KPI, ticker ou linha de tabela). */
export function HistoricoAtivoProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const { edicoes, atual } = useEstado();
  const radares = useMemo(() => edicoes.map((e) => e.radar), [edicoes]);
  const pontos = useMemo(() => (id ? serie(radares, id) : []), [radares, id]);
  const item = id && atual ? mapaPrecos(atual.radar).get(id) : undefined;
  const series = useMemo(() => [{ nome: item?.nome ?? id ?? '', pontos }], [item?.nome, id, pontos]);

  useEffect(() => {
    if (!id) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setId(null);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [id]);

  return (
    <Ctx.Provider value={setId}>
      {children}
      {id && (
        <div className="modal-fundo" onClick={() => setId(null)}>
          <div
            className="modal modal-largo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hist-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-cabeca">
              <div>
                <h2 id="hist-titulo">{item?.nome ?? id}</h2>
                {item && (
                  <p className="kpi-linha">
                    <span className="num">{valorComUnidade(item.valor, item.unidade)}</span> <Variacao item={item} />
                  </p>
                )}
              </div>
              <button type="button" className="btn btn-icone" onClick={() => setId(null)} aria-label="Fechar" autoFocus>
                ✕
              </button>
            </div>
            {pontos.length >= 2 ? (
              <Grafico series={series} rotulo={`Histórico de ${item?.nome ?? id}`} />
            ) : (
              <Leitura
                titulo="Histórico"
                texto={
                  pontos.length === 1
                    ? `Só há um valor (${dataCurta(pontos[0]!.x)}). O gráfico aparece a partir de duas edições carregadas.`
                    : 'Nenhum valor numérico deste ativo nas edições salvas.'
                }
              />
            )}
            {item?.fonte && (
              <p className="mudo pequeno">
                Fonte:{' '}
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer noopener">
                    {item.fonte}
                  </a>
                ) : (
                  item.fonte
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useAbrirHistorico = () => useContext(Ctx);
