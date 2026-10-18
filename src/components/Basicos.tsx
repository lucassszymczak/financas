import type { ReactNode } from 'react';
import type { Fonte, Preco } from '../schema/radar';
import { diaMes, numero, variacao as calcVariacao } from '../lib/formato';
import { dadoAntigo } from '../lib/pregao';

export type TomSelo = 'neutro' | 'positivo' | 'negativo' | 'misto' | 'aviso' | 'info' | 'destaque';

export function Selo({ tom = 'neutro', children, title }: { tom?: TomSelo; children: ReactNode; title?: string }) {
  return (
    <span className={`selo selo-${tom}`} title={title}>
      {children}
    </span>
  );
}

/** Variação colorida com seta (▲ verde / ▼ vermelho). */
export function Variacao({
  item,
  grande = false,
}: {
  item: { variacao_pct?: number | null; variacao_pb?: number | null };
  grande?: boolean;
}) {
  const v = calcVariacao(item);
  if (!v) return <span className="var var-estavel">—</span>;
  const leitura = v.dir === 'alta' ? 'alta de' : v.dir === 'baixa' ? 'queda de' : 'estável,';
  return (
    <span className={`var var-${v.dir}${grande ? ' var-grande' : ''}`}>
      <span aria-hidden="true">{v.seta} </span>
      <span className="sr-only">{leitura} </span>
      {v.texto.replace(/^[+−]/, '')}
    </span>
  );
}

/** Nota da fonte em estrelas (0 a 5, aceita meia estrela). */
export function Estrelas({ nota }: { nota: number | null | undefined }) {
  if (nota === null || nota === undefined) return null;
  const rotulo = `nota ${numero(nota, 0, 1)} de 5`;
  return (
    <span className="estrelas" title={`Nota da fonte: ${numero(nota, 0, 1)} de 5`} role="img" aria-label={rotulo}>
      <span className="estrelas-fundo" aria-hidden="true">
        ☆☆☆☆☆
      </span>
      <span className="estrelas-cheias" aria-hidden="true" style={{ width: `${(Math.min(5, Math.max(0, nota)) / 5) * 100}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

export function ListaFontes({ fontes }: { fontes: Fonte[] }) {
  if (!fontes.length) return null;
  return (
    <ul className="fontes">
      {fontes.map((f, i) => (
        <li key={i}>
          {f.url ? (
            <a href={f.url} target="_blank" rel="noreferrer noopener">
              {f.nome}
            </a>
          ) : (
            f.nome
          )}{' '}
          <Estrelas nota={f.nota} />
        </li>
      ))}
    </ul>
  );
}

/** Selo "dado de DD/MM" quando a data de referência é anterior ao último pregão esperado. */
export function SeloAntigo({ item, edicaoData }: { item: Pick<Preco, 'data_ref' | 'periodo'>; edicaoData: string }) {
  if (!dadoAntigo(item, edicaoData)) return null;
  return (
    <Selo tom="aviso" title="Data de referência anterior ao último pregão esperado">
      dado de {diaMes(item.data_ref)}
    </Selo>
  );
}

export function Leitura({
  texto,
  titulo = 'Leitura',
  destaque = false,
}: {
  texto: string | null | undefined;
  titulo?: string;
  destaque?: boolean;
}) {
  if (!texto) return null;
  return (
    <aside className={`leitura${destaque ? ' leitura-destaque' : ''}`}>
      <strong>{titulo}</strong>
      <p>{texto}</p>
    </aside>
  );
}

export function Secao({
  titulo,
  children,
  acoes,
  id,
}: {
  titulo: ReactNode;
  children: ReactNode;
  acoes?: ReactNode;
  id?: string;
}) {
  return (
    <section className="secao" aria-labelledby={id}>
      <div className="secao-topo">
        <h2 id={id}>{titulo}</h2>
        {acoes}
      </div>
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="vazio">{children}</p>;
}

/** Ícone de lixeira monocromático (segue a cor do texto do botão). */
export function IconeLixeira() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v5M9.2 6.5v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}
