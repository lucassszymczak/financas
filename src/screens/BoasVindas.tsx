import { BotaoCarregar, useCarregar } from '../components/Carregar';

export function BoasVindas({ nome }: { nome: string }) {
  const { carregarExemplo } = useCarregar();
  return (
    <div className="boas-vindas">
      <div className="boas-vindas-icone" aria-hidden="true">
        📡
      </div>
      <h1>{nome}</h1>
      <p>
        Este painel mostra o arquivo <code>radar_AAAA-MM-DD.json</code> que chega toda manhã. Nada é buscado na internet: os dados
        ficam guardados neste aparelho.
      </p>
      <ol>
        <li>Salve o arquivo do dia no celular ou no computador.</li>
        <li>
          Toque em <strong>Carregar Radar do dia</strong> e escolha o arquivo (pode escolher vários de uma vez).
        </li>
        <li>No computador, você também pode arrastar o arquivo para esta janela.</li>
      </ol>
      <div className="botoes">
        <BotaoCarregar />
        <button type="button" className="btn" onClick={() => void carregarExemplo()}>
          👀 Ver exemplo
        </button>
      </div>
      <p className="mudo pequeno">O exemplo é a edição de 16/10/2026. Você pode apagá-lo depois no Histórico.</p>
    </div>
  );
}
