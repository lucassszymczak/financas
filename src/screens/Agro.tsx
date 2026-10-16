import { useMemo } from 'react';
import { useRadar } from '../state';
import { Leitura, Secao, Vazio } from '../components/Basicos';
import { TabelaPrecos } from '../components/TabelaPrecos';
import { agrupar, leituraSecao, nomeRegiao } from '../lib/precos';

export function Agro() {
  const { radar } = useRadar();
  const regioes = useMemo(() => agrupar(radar.agro, (a) => a.regiao), [radar]);
  if (!regioes.length) return <Vazio>Esta edição não trouxe cotações do agro.</Vazio>;
  return (
    <div className="tela">
      <Leitura texto={leituraSecao(radar, 'agro')} />
      {regioes.map(([regiao, itens]) => (
        <Secao key={regiao} titulo={nomeRegiao(regiao)} id={`r-${regiao}`}>
          <Leitura texto={leituraSecao(radar, regiao)} />
          <TabelaPrecos itens={itens} edicaoData={radar.edicao.data} rotulo={nomeRegiao(regiao)} />
        </Secao>
      ))}
    </div>
  );
}
