import type { Preco, Radar } from '../schema/radar';
import { valorComUnidade } from '../lib/formato';
import { Variacao } from './Basicos';

/** Seções do ticker, na ordem em que aparecem. Grupos desconhecidos caem em "Outros". */
const SECOES: { nome: string; grupos: (g: string) => boolean }[] = [
  { nome: 'Índices', grupos: (g) => g === 'indices_br' },
  { nome: 'Mundo', grupos: (g) => g === 'indices_mundo' },
  { nome: 'Moedas', grupos: (g) => g.startsWith('moedas') },
  { nome: 'Juros', grupos: (g) => g.startsWith('juros') || g === 'curva_di' || g === 'tesouro' || g === 'renda_fixa' },
  { nome: 'Commodities', grupos: (g) => g.startsWith('commodities') },
  { nome: 'Ações', grupos: (g) => g.startsWith('acoes') },
  { nome: 'Agro', grupos: (g) => g === 'agro' },
];

export type SecaoTicker = { nome: string; itens: Preco[] };

/** Monta as seções do ticker: cotações do Radar + referências do agro (Chicago e Brasil). */
export function secoesTicker(r: Radar): SecaoTicker[] {
  const agro = r.agro.filter((a) => a.regiao === 'chicago' || a.regiao === 'brasil').map((a) => ({ ...a, grupo: 'agro' }));
  const itens: Preco[] = [...r.cotacoes, ...agro];
  const secoes = SECOES.map((s) => ({ nome: s.nome, itens: itens.filter((i) => s.grupos(i.grupo ?? '')) }));
  const usados = new Set(secoes.flatMap((s) => s.itens));
  const outros = itens.filter((i) => !usados.has(i));
  return [...secoes, { nome: 'Outros', itens: outros }].filter((s) => s.itens.length);
}

/** Faixa rolando com as cotações, dividida por seções. Pausa ao passar o mouse, focar ou tocar. */
export function Ticker({ radar, onAbrir }: { radar: Radar; onAbrir?: (id: string) => void }) {
  const secoes = secoesTicker(radar);
  const total = secoes.reduce((n, s) => n + s.itens.length, 0);
  if (!total) return null;
  const faixa = (copia: boolean) =>
    secoes.flatMap((s) => [
      <li key={`${copia ? 'b' : 'a'}-sec-${s.nome}`} className="ticker-secao" aria-hidden={copia || undefined}>
        {s.nome}
      </li>,
      ...s.itens.map((c) => (
        <li key={`${copia ? 'b' : 'a'}-${c.id}`} aria-hidden={copia || undefined}>
          <button type="button" tabIndex={copia ? -1 : 0} onClick={() => onAbrir?.(c.id)} className="ticker-item">
            <span className="ticker-nome">{c.nome_curto ?? (/^[A-Z0-9]{3,7}$/.test(c.id) ? c.id : c.nome)}</span>
            {c.valor !== null && c.valor !== undefined && <span className="num">{valorComUnidade(c.valor, c.unidade)}</span>}
            <Variacao item={c} />
          </button>
        </li>
      )),
    ]);
  // A duração cresce com o número de itens para manter a velocidade de leitura.
  const duracao = Math.max(30, (total + secoes.length) * 4);
  return (
    <div className="ticker" aria-label="Cotações">
      <ul className="ticker-trilho" style={{ animationDuration: `${duracao}s` }} tabIndex={-1}>
        {faixa(false)}
        {faixa(true)}
      </ul>
    </div>
  );
}
