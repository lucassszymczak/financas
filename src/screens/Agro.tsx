import { useMemo } from 'react';
import { useRadar } from '../state';
import { Leitura, Vazio } from '../components/Basicos';
import { ControlesVisao, GrupoAtivos, useVisaoOrdem } from '../components/GrupoAtivos';
import { agrupar, leituraSecao, nomeRegiao } from '../lib/precos';

export function Agro() {
  const { radar, edicoes } = useRadar();
  const { visao, setVisao, ordem, setOrdem } = useVisaoOrdem('agro');
  const radares = useMemo(() => edicoes.map((e) => e.radar), [edicoes]);
  const regioes = useMemo(() => agrupar(radar.agro, (a) => a.regiao), [radar]);
  if (!regioes.length) return <Vazio>Esta edição não trouxe cotações do agro.</Vazio>;
  return (
    <div className="tela">
      <Leitura texto={leituraSecao(radar, 'agro')} />
      <ControlesVisao visao={visao} setVisao={setVisao} ordem={ordem} setOrdem={setOrdem} />
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
