import { useMemo, useState } from 'react';
import { useRadar } from '../state';
import { itensCategoria, setorDe, setoresDoRadar } from '../lib/categorias';
import { Vazio } from '../components/Basicos';
import { TabelaAtivos } from '../components/TabelaAtivos';

/** Lista de uma categoria (Ações, Moedas, Curva DI…) em tabela ordenável; Ações ganha filtro por setor. */
export function Categoria({ id }: { id: string }) {
  const { radar } = useRadar();
  const [setor, setSetor] = useState<string | null>(null);
  const acoes = id === 'acoes';
  const todos = useMemo(() => itensCategoria(radar, id), [radar, id]);
  const setores = acoes ? setoresDoRadar(radar) : [];
  const itens = acoes && setor ? todos.filter((p) => setorDe(p) === setor) : todos;
  if (!todos.length) return <Vazio>Esta edição não trouxe ativos nesta categoria.</Vazio>;
  return (
    <>
      {setores.length > 0 && (
        <div className="chips" role="group" aria-label="Filtrar por setor">
          {[null, ...setores.map((s) => s.setor)].map((s) => (
            <button key={s ?? ''} type="button" className="chip-filtro" aria-pressed={setor === s} onClick={() => setSetor(s)}>
              {s ?? 'Todos'}
            </button>
          ))}
        </div>
      )}
      <TabelaAtivos itens={itens} comSetor={acoes} edicaoData={radar.edicao.data} />
    </>
  );
}
