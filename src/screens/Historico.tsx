import { useMemo, useState } from 'react';
import { useEstado } from '../state';
import { Secao, Vazio } from '../components/Basicos';
import { useDialogo } from '../components/Dialogo';
import { useCarregar } from '../components/Carregar';
import { Grafico, type SerieGrafico } from '../components/Grafico';
import { apagarEdicao } from '../lib/db';
import { dataCurta, dataHora, diaSemanaCurto, numero, somaDias } from '../lib/formato';
import { serie, todosPrecos } from '../lib/precos';
import { irPara } from '../router';

const PERIODOS = [
  { dias: 7, nome: '7 dias' },
  { dias: 30, nome: '30 dias' },
  { dias: 90, nome: '90 dias' },
  { dias: 0, nome: 'Tudo' },
];

const umaCasa = (v: number) => numero(v, 1);
const NOMES_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const nomeMes = (aaaaMm: string) => {
  const s = NOMES_MES.format(new Date(`${aaaaMm}-15T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Base 100 no primeiro ponto do período (para comparar ativos de escalas diferentes). */
export function normalizar(pontos: { x: string; y: number }[]): { x: string; y: number }[] {
  const base = pontos[0]?.y;
  if (!base) return [];
  return pontos.map((p) => ({ x: p.x, y: (p.y / base) * 100 }));
}

export function Historico() {
  const { edicoes, atual, abrirEdicao, recarregar } = useEstado();
  const { confirmar } = useDialogo();
  const { aviso } = useCarregar();
  const radares = useMemo(() => edicoes.map((e) => e.radar), [edicoes]);

  // Ativos disponíveis: todos os ids com valor numérico em alguma edição.
  const ativos = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of radares) for (const p of todosPrecos(r)) if (p.valor !== null && p.valor !== undefined) m.set(p.id, p.nome);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [radares]);

  const [escolhidos, setEscolhidos] = useState<string[]>(() => ['IBOV', 'USDBRL'].filter((id) => ativos.some(([a]) => a === id)));
  const [periodo, setPeriodo] = useState(30);
  const [modo, setModo] = useState<'normalizado' | 'valor'>('normalizado');

  const series: SerieGrafico[] = useMemo(() => {
    const ultima = edicoes[0]?.data;
    const inicio = periodo && ultima ? somaDias(ultima, -periodo) : '';
    return escolhidos.map((id) => {
      const pts = serie(radares, id).filter((p) => p.x >= inicio);
      return { nome: ativos.find(([a]) => a === id)?.[1] ?? id, pontos: modo === 'normalizado' ? normalizar(pts) : pts };
    });
  }, [escolhidos, periodo, modo, radares, edicoes, ativos]);

  const temGrafico = series.some((s) => s.pontos.length >= 2);
  const meses = useMemo(() => {
    const m = new Map<string, typeof edicoes>();
    for (const e of edicoes) {
      const k = e.data.slice(0, 7);
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()];
  }, [edicoes]);

  const apagar = async (data: string) => {
    const ok = await confirmar({
      titulo: 'Apagar edição',
      texto: `Apagar a edição de ${dataCurta(data)} deste aparelho? Isso não pode ser desfeito (a não ser por um backup).`,
      ok: 'Apagar',
      perigo: true,
    });
    if (!ok) return;
    await apagarEdicao(data);
    if (atual?.data === data) abrirEdicao(null);
    await recarregar();
    aviso(`Edição de ${dataCurta(data)} apagada.`);
  };

  if (!edicoes.length) return <Vazio>Nenhuma edição salva.</Vazio>;

  return (
    <div className="tela">
      <Secao titulo="Comparar ativos" id="sec-comparar">
        <div className="cartao">
          <div className="filtros">
            {[0, 1, 2].map((i) => (
              <label key={i} className="campo">
                <span>Ativo {i + 1}</span>
                <select
                  value={escolhidos[i] ?? ''}
                  onChange={(e) => {
                    const novo = [...escolhidos];
                    if (e.target.value) novo[i] = e.target.value;
                    else novo.splice(i, 1);
                    setEscolhidos(novo.filter((v, j) => v && novo.indexOf(v) === j));
                  }}
                  disabled={i > escolhidos.length}
                >
                  <option value="">{i === 0 ? 'Escolha…' : '(nenhum)'}</option>
                  {ativos.map(([id, nome]) => (
                    <option key={id} value={id}>
                      {nome} ({id})
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="filtros">
            <div className="alternador" role="group" aria-label="Período">
              {PERIODOS.map((p) => (
                <button key={p.dias} type="button" aria-pressed={periodo === p.dias} onClick={() => setPeriodo(p.dias)}>
                  {p.nome}
                </button>
              ))}
            </div>
            <div className="alternador" role="group" aria-label="Escala">
              <button type="button" aria-pressed={modo === 'normalizado'} onClick={() => setModo('normalizado')}>
                Normalizado (base 100)
              </button>
              <button type="button" aria-pressed={modo === 'valor'} onClick={() => setModo('valor')}>
                Valor
              </button>
            </div>
          </div>
          {temGrafico ? (
            <Grafico series={series} rotulo="Comparação de ativos" formatar={modo === 'normalizado' ? umaCasa : undefined} />
          ) : (
            <Vazio>
              {escolhidos.length
                ? 'Ainda não há pontos suficientes no período. O gráfico aparece com pelo menos duas edições carregadas.'
                : 'Escolha até 3 ativos para comparar.'}
            </Vazio>
          )}
          {modo === 'normalizado' && temGrafico && (
            <p className="mudo pequeno">Cada ativo começa em 100 no primeiro dia do período; 105 significa alta de 5%.</p>
          )}
        </div>
      </Secao>

      <Secao titulo={`Edições salvas (${edicoes.length})`} id="sec-edicoes">
        {meses.map(([mes, lista]) => (
          <div key={mes} className="cartao">
            <h3 className="mes">{nomeMes(mes)}</h3>
            <ul className="lista-edicoes">
              {lista.map((e) => (
                <li key={e.data} className={atual?.data === e.data ? 'atual' : undefined}>
                  <div className="edicao-info">
                    <strong>
                      {dataCurta(e.data)} <span className="mudo">({diaSemanaCurto(e.data)})</span>
                    </strong>
                    <span className="mudo pequeno">
                      {e.radar.termometro?.tom ? `Tom: ${e.radar.termometro.tom} · ` : ''}importada em {dataHora(e.importadoEm)}
                    </span>
                  </div>
                  <div className="botoes">
                    <button
                      type="button"
                      className="btn btn-pequeno"
                      onClick={() => {
                        abrirEdicao(e.data === edicoes[0]?.data ? null : e.data);
                        irPara('hoje');
                      }}
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      className="btn btn-pequeno btn-icone"
                      aria-label={`Apagar edição de ${dataCurta(e.data)}`}
                      onClick={() => void apagar(e.data)}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Secao>
    </div>
  );
}
