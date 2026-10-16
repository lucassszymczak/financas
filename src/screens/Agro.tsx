import { useMemo } from 'react';
import { useRadar } from '../state';
import { Leitura, Vazio } from '../components/Basicos';
import { ControlesVisao, GrupoAtivos, useVisaoOrdem } from '../components/GrupoAtivos';
import { agrupar, leituraSecao, nomeRegiao } from '../lib/precos';
import { hrefRota } from '../router';

/** Agro: um grupo por praça; `praca` (do menu) mostra só aquela praça. */
export function Agro({ praca = null }: { praca?: string | null }) {
  const { radar, edicoes } = useRadar();
  const { visao, setVisao, ordem, setOrdem } = useVisaoOrdem('agro');
  const radares = useMemo(() => edicoes.map((e) => e.radar), [edicoes]);
  const todas = useMemo(() => agrupar(radar.agro, (a) => a.regiao), [radar]);
  const regioes = praca ? todas.filter(([r]) => r === praca) : todas;
  if (!todas.length) return <Vazio>Esta edição não trouxe cotações do agro.</Vazio>;
  return (
    <div className="tela">
      <Leitura titulo="🔎 Leitura do agro" texto={leituraSecao(radar, 'agro')} destaque />
      <ControlesVisao visao={visao} setVisao={setVisao} ordem={ordem} setOrdem={setOrdem} />
      {praca && (
        <p>
          <a href={hrefRota('agro')}>← Ver todas as praças</a>
        </p>
      )}
      {!regioes.length && <Vazio>Esta edição não trouxe cotações desta praça.</Vazio>}
      <div className="grupos">
        {regioes.map(([regiao, itens]) => {
          const leitura = leituraSecao(radar, regiao);
          return (
            <GrupoAtivos
              key={regiao}
              chave={`agro:${regiao}`}
              titulo={nomeRegiao(regiao)}
              itens={itens}
              edicaoData={radar.edicao.data}
              visao={visao}
              ordem={ordem}
              radares={radares}
              topo={leitura ? <p className="grupo-leitura">🔎 {leitura}</p> : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
