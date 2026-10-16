import { useMemo } from 'react';
import { useRadar } from '../state';
import { CardNoticia } from '../components/CardNoticia';
import { FaixaAlertas } from '../components/FaixaAlertas';
import { KpiCard } from '../components/KpiCard';
import { Leitura, Secao, Selo, type TomSelo } from '../components/Basicos';
import { useAbrirHistorico } from '../components/HistoricoAtivo';
import { calcularAlertas } from '../lib/alertas';
import { serie } from '../lib/precos';
import { dataHora } from '../lib/formato';

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

export function Hoje() {
  const { radar, config } = useRadar();
  const alertas = useMemo(() => calcularAlertas(radar, config.limites), [radar, config.limites]);
  const t = radar.termometro;

  return (
    <div className="tela">
      <Kpis />

      {t && (
        <section className="termometro" aria-label="Termômetro do dia">
          <div className="termometro-topo">
            <h2>🌡️ Termômetro</h2>
            {t.tom && <Selo tom={TOM_TERMOMETRO[t.tom.toLowerCase()] ?? 'neutro'}>{t.tom}</Selo>}
          </div>
          <p>{t.texto}</p>
          {radar.edicao.referencia_mercado && <p className="mudo pequeno">Referência: {radar.edicao.referencia_mercado}</p>}
        </section>
      )}

      <FaixaAlertas alertas={alertas} />

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

      {radar.leitura_do_dia && (
        <Secao titulo="🧠 Leitura do dia" id="sec-leitura">
          <p className="texto-leitura">{radar.leitura_do_dia}</p>
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
