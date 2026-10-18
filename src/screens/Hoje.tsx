import { useMemo } from 'react';
import { useRadar } from '../state';
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

/** As leituras do dia em destaque, antes dos números: o "e daí?" de cada seção. */
function PainelLeituras() {
  const { radar } = useRadar();
  const secoes = Object.entries(radar.leituras_secao ?? {})
    .filter((e): e is [string, string] => !!e[1])
    .map(([chave, texto]) => ({ chave, texto, ...(LEITURAS[chave] ?? { rotulo: humanizar(chave), aba: 'hoje' }) }));
  const noCampo = radar.clima?.no_campo;
  if (!radar.leitura_do_dia && !secoes.length && !noCampo) return null;
  return (
    <section className="painel-leituras" aria-labelledby="titulo-leituras">
      <h2 id="titulo-leituras">Leituras do dia</h2>
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

export function Hoje() {
  const { radar, config } = useRadar();
  const alertas = useMemo(() => calcularAlertas(radar, config.limites), [radar, config.limites]);
  const t = radar.termometro;

  return (
    <div className="tela">
      {t && (
        <section className="termometro" aria-label="Termômetro do dia">
          <div className="termometro-topo">
            <h2>Termômetro</h2>
            {t.tom && <Selo tom={TOM_TERMOMETRO[t.tom.toLowerCase()] ?? 'neutro'}>{t.tom}</Selo>}
          </div>
          <p>{t.texto}</p>
          {radar.edicao.referencia_mercado && <p className="mudo pequeno">Referência: {radar.edicao.referencia_mercado}</p>}
        </section>
      )}

      <PainelLeituras />

      <FaixaAlertas alertas={alertas} />

      <Kpis />

      {radar.destaques.length > 0 && (
        <Secao titulo="Destaques" id="sec-destaques">
          <div className="lista-cards">
            {radar.destaques.map((d) => (
              <CardNoticia key={d.id} item={d} />
            ))}
          </div>
        </Secao>
      )}

      {radar.noticias.length > 0 && (
        <Secao titulo="Outras notícias" id="sec-noticias">
          <div className="lista-cards">
            {radar.noticias.map((n) => (
              <CardNoticia key={n.id} item={n} noticia />
            ))}
          </div>
        </Secao>
      )}

      {radar.limitacoes.length > 0 && (
        <details className="limitacoes">
          <summary>Limitações desta edição ({radar.limitacoes.length})</summary>
          <ul>
            {radar.limitacoes.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </details>
      )}

      <Leitura titulo="Aviso" texto={radar.aviso ?? 'Material informativo de uso interno, não é recomendação de investimento.'} />
      {radar.edicao.gerado_em && <p className="mudo pequeno centro">Gerado em {dataHora(radar.edicao.gerado_em)}</p>}
    </div>
  );
}
