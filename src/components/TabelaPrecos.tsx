import { useMemo, useState } from 'react';
import type { Preco } from '../schema/radar';
import { diaMes, valorComUnidade } from '../lib/formato';
import { Estrelas, SeloAntigo, Selo, Variacao } from './Basicos';
import { useAbrirHistorico } from './HistoricoAtivo';

type Coluna = 'ativo' | 'valor' | 'variacao' | 'data' | 'fonte';
const COLUNAS: { id: Coluna; nome: string }[] = [
  { id: 'ativo', nome: 'Ativo' },
  { id: 'valor', nome: 'Valor' },
  { id: 'variacao', nome: 'Variação' },
  { id: 'data', nome: 'Data ref.' },
  { id: 'fonte', nome: 'Fonte' },
];

const varNum = (p: Preco) => p.variacao_pb ?? p.variacao_pct ?? null;

function chave(p: Preco, c: Coluna): string | number | null {
  switch (c) {
    case 'ativo':
      return p.nome.toLowerCase();
    case 'valor':
      return p.valor ?? null;
    case 'variacao':
      return varNum(p);
    case 'data':
      return p.data_ref ?? null;
    case 'fonte':
      return (p.fonte ?? '').toLowerCase() || null;
  }
}

/**
 * Tabela ordenável de preços. Clicar no nome abre o histórico.
 * `ausentes`: ids da watchlist que não vieram no arquivo do dia.
 */
export function TabelaPrecos({
  itens,
  edicaoData,
  ausentes = [],
  rotulo,
}: {
  itens: Preco[];
  edicaoData: string;
  ausentes?: string[];
  rotulo: string;
}) {
  const abrir = useAbrirHistorico();
  const [ordem, setOrdem] = useState<{ col: Coluna; asc: boolean } | null>(null);

  const linhas = useMemo(() => {
    if (!ordem) return itens;
    return [...itens].sort((a, b) => {
      const va = chave(a, ordem.col);
      const vb = chave(b, ordem.col);
      // Vazios sempre no fim.
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR');
      return ordem.asc ? r : -r;
    });
  }, [itens, ordem]);

  const clicar = (col: Coluna) =>
    setOrdem((o) => (o?.col === col ? (o.asc ? { col, asc: false } : null) : { col, asc: col === 'ativo' || col === 'fonte' }));

  return (
    <div className="tabela-rolagem">
      <table className="tabela">
        <caption className="sr-only">{rotulo}</caption>
        <thead>
          <tr>
            {COLUNAS.map((c) => {
              const ativa = ordem?.col === c.id;
              return (
                <th
                  key={c.id}
                  scope="col"
                  className={c.id === 'valor' || c.id === 'variacao' ? 'dir' : undefined}
                  aria-sort={ativa ? (ordem!.asc ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" onClick={() => clicar(c.id)}>
                    {c.nome}
                    <span aria-hidden="true" className="seta-ordem">
                      {ativa ? (ordem!.asc ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {linhas.map((p) => (
            <tr key={p.id}>
              <th scope="row">
                <button type="button" className="link-ativo" onClick={() => abrir(p.id)} title="Ver histórico">
                  <span className="ativo-nome">{p.nome}</span>
                  <span className="ativo-id">{p.id}</span>
                </button>
              </th>
              <td className="dir num">
                {p.valor === null || p.valor === undefined ? (
                  <span className="sem-preco" title="O arquivo do dia não trouxe o preço deste ativo">
                    sem preço no arquivo
                  </span>
                ) : (
                  <strong>{valorComUnidade(p.valor, p.unidade)}</strong>
                )}
              </td>
              <td className="dir">
                <Variacao item={p} />
              </td>
              <td>
                <span className="celula-data">
                  {p.periodo ? `semana ${p.periodo}` : diaMes(p.data_ref)}
                  <SeloAntigo item={p} edicaoData={edicaoData} />
                </span>
              </td>
              <td className="celula-fonte">
                {p.fonte ? (
                  p.url ? (
                    <a href={p.url} target="_blank" rel="noreferrer noopener">
                      {p.fonte}
                    </a>
                  ) : (
                    p.fonte
                  )
                ) : (
                  '—'
                )}{' '}
                <Estrelas nota={p.nota_fonte} />
              </td>
            </tr>
          ))}
          {ausentes.map((id) => (
            <tr key={`ausente-${id}`} className="linha-ausente">
              <th scope="row">
                <span className="ativo-nome">{id.replace(/_\*$/, ' (qualquer vencimento)')}</span>
              </th>
              <td colSpan={4}>
                <Selo>sem dado hoje</Selo>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
