import type { VisaoCresol } from '../schema/radar';
import { dataCurta, diaMes, numero } from '../lib/formato';
import { hrefRota } from '../router';
import { useEstado } from '../state';

type Projecao = VisaoCresol['projecoes'][number];

/**
 * A Visão Cresol mais recente até a data em exibição. Ela é mensal: vale a última que chegou num arquivo,
 * mesmo que as edições seguintes não a repitam.
 */
export function useVisaoCresol(): VisaoCresol | null {
  const { edicoes, atual } = useEstado();
  const ate = atual?.data ?? '9999-12-31';
  let melhor: VisaoCresol | null = null;
  for (const e of edicoes) {
    const v = e.radar.visao_cresol;
    if (!v || e.data > ate) continue;
    const chave = (x: VisaoCresol) => x.data_base ?? x.recebido_em ?? '';
    if (!melhor || chave(v) > chave(melhor)) melhor = v;
  }
  return melhor;
}

/** "5,10%", "13,75% a.a.", "R$ 5,50". */
export function valorProjecao(v: number | null | undefined, unidade?: string | null): string {
  if (v === null || v === undefined) return '—';
  const u = (unidade ?? '').trim();
  if (/^R\$\s*\/\s*US\$$/i.test(u)) return `R$ ${numero(v, 2)}`;
  if (u.startsWith('%')) return `${numero(v, 2)}${u}`;
  return u ? `${numero(v, 2)} ${u}` : numero(v, 2);
}

/** Linhas da tabela (um indicador por linha, anos nas colunas), na ordem em que vieram. */
export function tabelaProjecoes(p: Projecao[]) {
  const anos = [...new Set(p.map((x) => x.ano))].sort();
  const indicadores = [...new Set(p.map((x) => x.indicador))];
  return {
    anos,
    linhas: indicadores.map((ind) => ({
      indicador: ind,
      porAno: anos.map((a) => p.find((x) => x.indicador === ind && x.ano === a)),
    })),
  };
}

function Vies({ vies }: { vies?: string | null }) {
  if (!vies) return null;
  const alta = /alta/i.test(vies);
  return (
    <span className="vc-vies" title={`Viés de ${vies}`}>
      {alta ? '↑' : '↓'} viés de {vies}
    </span>
  );
}

/** Comparação com o Focus: "= Focus", "acima do Focus (5,40)", "abaixo do Focus (1,02)". */
function Focus({ p }: { p: Projecao }) {
  if (p.focus === null || p.focus === undefined) return null;
  const d = p.valor === null || p.valor === undefined ? null : Math.round((p.valor - p.focus) * 100) / 100;
  const texto = d === null || d === 0 ? 'igual ao Focus' : d > 0 ? 'acima do Focus' : 'abaixo do Focus';
  return (
    <span className={`vc-focus${d ? ' vc-focus-dif' : ''}`}>
      {texto} {d !== 0 && <span className="num">({valorProjecao(p.focus, p.unidade)})</span>}
    </span>
  );
}

function TabelaProjecoes({ v, compacta = false }: { v: VisaoCresol; compacta?: boolean }) {
  const { anos, linhas } = tabelaProjecoes(v.projecoes);
  if (!linhas.length) return null;
  return (
    <div className="tabela-rolagem">
      <table className="vc-tabela">
        <caption className="sr-only">Projeções da Cresol comparadas com o boletim Focus</caption>
        <thead>
          <tr>
            <th scope="col">Indicador</th>
            {anos.map((a) => (
              <th key={a} scope="col" className="dir">
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.indicador}>
              <th scope="row">{l.indicador}</th>
              {l.porAno.map((p, i) => (
                <td key={anos[i]} className="dir">
                  {p ? (
                    <>
                      <span className="vc-valor num">{valorProjecao(p.valor, p.unidade)}</span>
                      <Vies vies={p.vies} />
                      {!compacta && <Focus p={p} />}
                      {compacta && p.focus !== null && p.focus !== undefined && p.valor !== p.focus && (
                        <span className="vc-focus vc-focus-dif num">Focus {valorProjecao(p.focus, p.unidade)}</span>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Assinatura({ v }: { v: VisaoCresol }) {
  return (
    <p className="vc-assinatura mudo pequeno">
      {v.autora}
      {v.data_base && ` · informações até ${diaMes(v.data_base)}`}
      {v.recebido_em && ` · recebido em ${diaMes(v.recebido_em)}`}
    </p>
  );
}

/** Cartão da tela Hoje: resumo, projeções e o link para a análise completa. */
export function CartaoVisaoCresol() {
  const v = useVisaoCresol();
  if (!v) return null;
  return (
    <section className="visao-cresol" aria-labelledby="titulo-visao-cresol">
      <div className="vc-cab">
        <span className="vc-rotulo">Visão Cresol</span>
        <h2 id="titulo-visao-cresol">{v.titulo}</h2>
        <Assinatura v={v} />
      </div>
      {v.resumo && <p className="vc-resumo">{v.resumo}</p>}
      <TabelaProjecoes v={v} compacta />
      <a className="vc-mais" href={hrefRota('visao-cresol')}>
        Ler a análise completa →
      </a>
    </section>
  );
}

/** Página completa: projeções x Focus, pontos por tema, comparação com o mercado, fonte e aviso. */
export function PaginaVisaoCresol() {
  const v = useVisaoCresol();
  if (!v)
    return (
      <div className="tela">
        <p className="vazio">Nenhum arquivo carregado trouxe a Visão Cresol ainda.</p>
      </div>
    );
  return (
    <div className="tela visao-cresol-pagina">
      <section className="visao-cresol" aria-labelledby="titulo-visao-cresol">
        <div className="vc-cab">
          <span className="vc-rotulo">Visão Cresol</span>
          <h2 id="titulo-visao-cresol">{v.titulo}</h2>
          <Assinatura v={v} />
        </div>
        {v.resumo && <p className="vc-resumo">{v.resumo}</p>}
      </section>

      <section className="secao" aria-labelledby="titulo-vc-proj">
        <div className="secao-topo">
          <h2 id="titulo-vc-proj">Projeções</h2>
          {v.focus_data_ref && <span className="mudo pequeno">Focus de {dataCurta(v.focus_data_ref)}</span>}
        </div>
        <TabelaProjecoes v={v} />
      </section>

      {v.pontos.length > 0 && (
        <section className="secao" aria-labelledby="titulo-vc-pontos">
          <div className="secao-topo">
            <h2 id="titulo-vc-pontos">Por tema</h2>
          </div>
          <div className="vc-pontos">
            {v.pontos.map((p) => (
              <article key={p.tema} className="vc-ponto">
                <h3>{p.tema}</h3>
                <p>{p.texto}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {v.comparacao_mercado && (
        <section className="leitura" aria-label="Comparação com o mercado">
          <strong>Comparação com o mercado</strong>
          <p>{v.comparacao_mercado}</p>
        </section>
      )}

      <footer className="vc-rodape mudo pequeno">
        {v.fonte && <p>Fonte: {v.fonte}</p>}
        {v.aviso && <p>{v.aviso}</p>}
      </footer>
    </div>
  );
}
