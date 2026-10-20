import { useMemo, useState, type ReactNode } from 'react';
import { useRadar, type Edicao } from '../state';
import type { Radar } from '../schema/radar';
import { fundirNoticias, filtrarNoticias, type FiltroNoticias, type NoticiaFundida } from '../lib/noticias';
import { horaBR, horaEdicao, rotuloTipo } from '../lib/edicoes';
import { CardNoticia } from '../components/CardNoticia';
import { FaixaAlertas } from '../components/FaixaAlertas';
import { KpiCard } from '../components/KpiCard';
import { Leitura, Secao, Selo, type TomSelo } from '../components/Basicos';
import { useAbrirHistorico } from '../components/HistoricoAtivo';
import { calcularAlertas } from '../lib/alertas';
import { serie } from '../lib/precos';
import { dataHora, humanizar } from '../lib/formato';

const TOM_TERMOMETRO: Record<string, TomSelo> = {
  otimismo: 'positivo',
  positivo: 'positivo',
  alivio: 'positivo',
  alívio: 'positivo',
  neutro: 'neutro',
  cautela: 'aviso',
  misto: 'misto',
  tensao: 'negativo',
  tensão: 'negativo',
  pessimismo: 'negativo',
  negativo: 'negativo',
};

export function Kpis() {
  const { radar, edicoes, config } = useRadar();
  const abrir = useAbrirHistorico();
  const radares = useMemo(() => edicoes.map((e) => e.radar), [edicoes]);
  const kpis = [...radar.cotacoes, ...radar.agro].filter((c) => c.kpi);
  if (!kpis.length) return null;
  return (
    <section className="kpis" aria-label="Indicadores principais">
      {kpis.map((k) => (
        <KpiCard
          key={k.id}
          item={k}
          serie={serie(radares, k.id)}
          edicaoData={radar.edicao.data}
          limites={config.limites}
          onAbrir={abrir}
        />
      ))}
    </section>
  );
}

/** Rótulo e destino de cada leitura de seção conhecida. */
const LEITURAS: Record<string, { rotulo: string; aba: string }> = {
  mercado: { rotulo: 'Mercado', aba: 'mercado' },
  agro: { rotulo: 'Agro', aba: 'agro' },
  brasil_agro: { rotulo: 'Agro Brasil', aba: 'agro/brasil' },
  brasil: { rotulo: 'Agro Brasil', aba: 'agro/brasil' },
  chicago: { rotulo: 'Chicago', aba: 'agro/chicago' },
  guarapuava: { rotulo: 'Guarapuava', aba: 'agro/guarapuava' },
  noroeste_paulista: { rotulo: 'Noroeste Paulista', aba: 'agro/noroeste_paulista' },
  juros: { rotulo: 'Juros', aba: 'renda-fixa' },
};

/**
 * Origem de um texto do dia quando há mais de uma edição: hora da edição mais recente que o trouxe
 * e a versão da manhã, se for diferente.
 */
function origemTexto<T>(doDia: Edicao[], f: (r: Radar) => T | null | undefined, igual = (a: T, b: T) => a === b) {
  if (doDia.length < 2) return null;
  const com = doDia.filter((e) => f(e.radar));
  const ultima = com.at(-1);
  if (!ultima || ultima === doDia[0]) return null;
  const manha = f(doDia[0]!.radar);
  const atual = f(ultima.radar)!;
  return { hora: horaEdicao(ultima.radar), manha: manha && !igual(manha, atual) ? manha : null };
}

/** "atualizado às 12h30" + "ver da manhã" (quando o texto mudou). */
function Atualizado({ origem, children }: { origem: ReturnType<typeof origemTexto<unknown>>; children?: ReactNode }) {
  if (!origem) return null;
  return (
    <div className="atualizado">
      <span className="selo selo-info">atualizado às {horaBR(origem.hora)}</span>
      {origem.manha !== null && children && (
        <details className="ver-manha">
          <summary>ver da manhã</summary>
          {children}
        </details>
      )}
    </div>
  );
}

/** As leituras do dia em destaque, antes dos números: o "e daí?" de cada seção. */
function PainelLeituras() {
  const { radar, vista } = useRadar();
  const origem = origemTexto(vista.doDia, (r) => r.leitura_do_dia);
  const origemSecoes = origemTexto(vista.doDia, (r) => JSON.stringify(r.leituras_secao ?? null));
  const manha = vista.doDia[0]!.radar;
  const secoes = Object.entries(radar.leituras_secao ?? {})
    .filter((e): e is [string, string] => !!e[1])
    .map(([chave, texto]) => ({ chave, texto, ...(LEITURAS[chave] ?? { rotulo: humanizar(chave), aba: 'hoje' }) }));
  const noCampo = radar.clima?.no_campo;
  if (!radar.leitura_do_dia && !secoes.length && !noCampo) return null;
  return (
    <section className="painel-leituras" aria-labelledby="titulo-leituras">
      <h2 id="titulo-leituras">Leituras do dia</h2>
      <Atualizado origem={origem ?? origemSecoes}>
        {manha.leitura_do_dia && <p className="leitura-principal">{manha.leitura_do_dia}</p>}
        {Object.entries(manha.leituras_secao ?? {}).map(([k, v]) =>
          v ? (
            <p key={k} className="pequeno">
              <strong>{LEITURAS[k]?.rotulo ?? humanizar(k)}:</strong> {v}
            </p>
          ) : null,
        )}
      </Atualizado>
      {radar.leitura_do_dia && <p className="leitura-principal">{radar.leitura_do_dia}</p>}
      {(secoes.length > 0 || noCampo) && (
        <ul className="leituras-secao">
          {secoes.map((l) => (
            <li key={l.chave}>
              <a href={`#/${l.aba}`}>
                <span className="ls-rotulo">{l.rotulo}</span>
                <span className="ls-texto">{l.texto}</span>
              </a>
            </li>
          ))}
          {noCampo && (
            <li>
              <a href="#/clima">
                <span className="ls-rotulo">No campo</span>
                <span className="ls-texto">{noCampo}</span>
              </a>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

const FILTROS: [FiltroNoticias, string][] = [
  ['todas', 'Todas'],
  ['manha', 'Manhã'],
  ['meio_dia', 'Meio-dia'],
  ['novas', 'Só novas/atualizadas'],
];

function SeloFusao({ n }: { n: NoticiaFundida }) {
  if (n.status === 'nova') return <span className="selo selo-destaque">Nova · {horaBR(n.horaSelo)}</span>;
  if (n.status === 'atualizada') return <span className="selo selo-info">Atualizada às {horaBR(n.horaSelo)}</span>;
  return null;
}

function Cartao({ n }: { n: NoticiaFundida }) {
  const extras = { selo: <SeloFusao n={n} />, anteriores: n.anteriores };
  return n.tipo === 'noticia' ? <CardNoticia item={n.item} noticia {...extras} /> : <CardNoticia item={n.item} {...extras} />;
}

/** Destaques e notícias do dia: lista única das edições (manhã + meio-dia), com selos e filtros. */
function NoticiasDoDia() {
  const { vista } = useRadar();
  const varias = vista.doDia.length > 1;
  const [filtro, setFiltro] = useState<FiltroNoticias>('todas');
  const todas = useMemo(() => fundirNoticias(vista.doDia.map((e) => e.radar)), [vista.doDia]);
  const lista = varias ? filtrarNoticias(todas, filtro) : todas;
  const destaques = lista.filter((n) => n.tipo === 'destaque');
  const outras = lista.filter((n) => n.tipo === 'noticia');
  if (!todas.length) return null;
  return (
    <>
      {varias && (
        <div className="alternador filtro-noticias" role="group" aria-label="Filtrar notícias">
          {FILTROS.map(([f, nome]) => (
            <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {nome}
            </button>
          ))}
        </div>
      )}
      {destaques.length > 0 && (
        <Secao titulo="Destaques" id="sec-destaques">
          <div className="lista-cards">
            {destaques.map((n) => (
              <Cartao key={n.chave} n={n} />
            ))}
          </div>
        </Secao>
      )}
      {outras.length > 0 && (
        <Secao titulo="Outras notícias" id="sec-noticias">
          <div className="lista-cards">
            {outras.map((n) => (
              <Cartao key={n.chave} n={n} />
            ))}
          </div>
        </Secao>
      )}
      {varias && !lista.length && <p className="mudo">Nenhuma notícia neste filtro.</p>}
    </>
  );
}

/** Limitações de cada edição do dia, separadas por horário. */
function Limitacoes() {
  const { vista } = useRadar();
  const comLimites = vista.doDia.filter((e) => e.radar.limitacoes.length);
  const total = comLimites.reduce((n, e) => n + e.radar.limitacoes.length, 0);
  if (!total) return null;
  const varias = vista.doDia.length > 1;
  return (
    <details className="limitacoes">
      <summary>
        {varias ? 'Limitações das edições' : 'Limitações desta edição'} ({total})
      </summary>
      {comLimites.map((e) => (
        <div key={e.chave}>
          {varias && (
            <h4>
              {rotuloTipo(e.radar)} · {horaBR(horaEdicao(e.radar))}
            </h4>
          )}
          <ul>
            {e.radar.limitacoes.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      ))}
    </details>
  );
}

export function Hoje() {
  const { radar, config, vista } = useRadar();
  const alertas = useMemo(() => calcularAlertas(radar, config.limites), [radar, config.limites]);
  const t = radar.termometro;
  const origemTermo = origemTexto(vista.doDia, (r) => r.termometro?.texto);
  const termoManha = vista.doDia[0]!.radar.termometro;

  return (
    <div className="tela">
      {t && (
        <section className="termometro" aria-label="Termômetro do dia">
          <div className="termometro-topo">
            <h2>Termômetro</h2>
            {t.tom && <Selo tom={TOM_TERMOMETRO[t.tom.toLowerCase()] ?? 'neutro'}>{t.tom}</Selo>}
          </div>
          <Atualizado origem={origemTermo}>{termoManha && <p>{termoManha.texto}</p>}</Atualizado>
          <p>{t.texto}</p>
          {radar.edicao.referencia_mercado && <p className="mudo pequeno">Referência: {radar.edicao.referencia_mercado}</p>}
        </section>
      )}

      <PainelLeituras />

      <FaixaAlertas alertas={alertas} />

      <Kpis />

      <NoticiasDoDia />

      <Limitacoes />

      <Leitura titulo="Aviso" texto={radar.aviso ?? 'Material informativo de uso interno, não é recomendação de investimento.'} />
      {radar.edicao.gerado_em && <p className="mudo pequeno centro">Gerado em {dataHora(radar.edicao.gerado_em)}</p>}
    </div>
  );
}
