import { useMemo, useState } from 'react';
import type { Preco } from '../schema/radar';
import { dataCurta, valorComUnidade } from '../lib/formato';
import { setorDe, variacaoNumero } from '../lib/categorias';
import { dadoAntigo } from '../lib/pregao';
import { AtivoIcone } from './AtivoIcone';
import { Selo, SeloOrigem, textoOrigem, Variacao } from './Basicos';
import { useAbrirHistorico } from './HistoricoAtivo';

type Coluna = 'id' | 'nome' | 'setor' | 'valor' | 'var' | 'data';

const valorDe = (p: Preco, c: Coluna): string | number | null => {
  switch (c) {
    case 'id':
      return p.id;
    case 'nome':
      return p.nome;
    case 'setor':
      return setorDe(p);
    case 'valor':
      return p.valor ?? null;
    case 'var':
      return variacaoNumero(p);
    case 'data':
      return p.data_ref ?? null;
  }
};

/** Ordena por qualquer coluna; vazios sempre no fim. */
export function ordenarAtivos(itens: Preco[], coluna: Coluna | null, sentido: 1 | -1): Preco[] {
  if (!coluna) return itens;
  return [...itens].sort((p, q) => {
    const a = valorDe(p, coluna);
    const b = valorDe(q, coluna);
    if (a === null) return b === null ? 0 : 1;
    if (b === null) return -1;
    return (typeof a === 'string' ? a.localeCompare(String(b), 'pt-BR') : a - (b as number)) * sentido;
  });
}

/** Tabela de ativos ordenável por qualquer coluna; tocar na linha abre o detalhe. */
export function TabelaAtivos({
  itens,
  comSetor = false,
  edicaoData,
}: {
  itens: Preco[];
  comSetor?: boolean;
  edicaoData: string;
}) {
  const abrir = useAbrirHistorico();
  const [ordem, setOrdem] = useState<{ c: Coluna | null; s: 1 | -1 }>({ c: null, s: -1 });
  const linhas = useMemo(() => ordenarAtivos(itens, ordem.c, ordem.s), [itens, ordem]);
  const colunas: [Coluna, string, boolean][] = [
    ['id', 'Ativo', false],
    ['nome', 'Nome', false],
    ...(comSetor ? ([['setor', 'Setor', false]] as [Coluna, string, boolean][]) : []),
    ['valor', 'Último', true],
    ['var', 'Variação', true],
    ['data', 'Data', true],
  ];
  const clicar = (c: Coluna) =>
    setOrdem((o) => (o.c === c ? { c, s: o.s === 1 ? -1 : 1 } : { c, s: c === 'valor' || c === 'var' ? -1 : 1 }));
  return (
    <div className="tabela-rolagem">
      <table className="tabela tabela-ativos">
        <thead>
          <tr>
            {colunas.map(([c, rotulo, dir]) => (
              <th
                key={c}
                className={dir ? 'dir' : undefined}
                scope="col"
                aria-sort={ordem.c === c ? (ordem.s === 1 ? 'ascending' : 'descending') : 'none'}
              >
                <button type="button" onClick={() => clicar(c)}>
                  {rotulo}
                  <span className="seta-ordem" aria-hidden="true">
                    {ordem.c === c ? (ordem.s === 1 ? '↑' : '↓') : '↕'}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="num">
          {linhas.map((p) => (
            <tr key={p.id} onClick={() => abrir(p.id)}>
              <td>
                <AtivoIcone id={p.id} grupo={p.grupo} nome={p.nome} regiao={p.regiao} />
                <button
                  type="button"
                  className="cod-ativo"
                  onClick={(e) => {
                    e.stopPropagation();
                    abrir(p.id);
                  }}
                  aria-label={`${p.nome}: ver detalhes`}
                >
                  {p.id}
                </button>
              </td>
              <td className="nome-ativo">{p.nome}</td>
              {comSetor && <td className="nome-ativo">{setorDe(p) ?? '—'}</td>}
              <td className="dir">{valorComUnidade(p.valor, p.unidade)}</td>
              <td className="dir">
                <span className="etiqueta-var">
                  <Variacao item={p} />
                </span>
              </td>
              <td className="dir">
                {p.periodo ? `sem. ${p.periodo}` : dataCurta(p.data_ref).slice(0, 5)}
                {dadoAntigo(p, edicaoData) && (
                  <>
                    {' '}
                    <Selo tom="aviso">antigo</Selo>
                  </>
                )}
                {textoOrigem(p) && (
                  <>
                    {' '}
                    <SeloOrigem item={p} />
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
