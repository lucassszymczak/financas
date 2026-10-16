import type { Cotacao } from '../schema/radar';
import { valorComUnidade } from '../lib/formato';
import { Variacao } from './Basicos';

/** Faixa rolando com as cotações. Pausa ao passar o mouse, focar ou tocar. */
export function Ticker({ cotacoes, onAbrir }: { cotacoes: Cotacao[]; onAbrir?: (id: string) => void }) {
  if (!cotacoes.length) return null;
  const itens = (copia: boolean) =>
    cotacoes.map((c) => (
      <li key={`${copia ? 'b' : 'a'}-${c.id}`} aria-hidden={copia || undefined}>
        <button type="button" tabIndex={copia ? -1 : 0} onClick={() => onAbrir?.(c.id)} className="ticker-item">
          <span className="ticker-nome">{c.nome_curto ?? c.id}</span>
          <span className="num">{valorComUnidade(c.valor, c.unidade)}</span>
          <Variacao item={c} />
        </button>
      </li>
    ));
  // A duração cresce com o número de itens para manter a velocidade de leitura.
  const duracao = Math.max(25, cotacoes.length * 4);
  return (
    <div className="ticker" aria-label="Cotações">
      <ul className="ticker-trilho" style={{ animationDuration: `${duracao}s` }} tabIndex={-1}>
        {itens(false)}
        {itens(true)}
      </ul>
    </div>
  );
}
