import type { Preco } from '../schema/radar';
import { diaMes, partesValor } from '../lib/formato';
import type { Ponto } from '../lib/precos';
import type { Limite } from '../lib/config';
import { limitesCruzados } from '../lib/alertas';
import { numeroAuto } from '../lib/formato';
import { SeloAntigo, SeloOrigem, Selo, Variacao } from './Basicos';
import { Sparkline } from './Sparkline';
import { AtivoIcone } from './AtivoIcone';

export function KpiCard({
  item,
  serie,
  edicaoData,
  limites,
  onAbrir,
}: {
  item: Preco;
  serie: Ponto[];
  edicaoData: string;
  limites: Limite[];
  onAbrir?: (id: string) => void;
}) {
  const cruzados = limitesCruzados(item, limites);
  return (
    <button
      type="button"
      className={`kpi${cruzados.length ? ' kpi-limite' : ''}`}
      onClick={() => onAbrir?.(item.id)}
      aria-label={`${item.nome}: ver histórico`}
    >
      <span className="kpi-nome">
        <AtivoIcone id={item.id} grupo={item.grupo} nome={item.nome} regiao={item.regiao} />
        <span className="kpi-nome-txt">{item.nome}</span>
      </span>
      <ValorKpi valor={item.valor} unidade={item.unidade} />
      <span className="kpi-linha">
        <Variacao item={item} grande />
        <Sparkline pontos={serie} unidade={item.unidade} />
      </span>
      <span className="kpi-rodape">
        <span className="mudo">{item.periodo ? `semana ${item.periodo}` : `ref. ${diaMes(item.data_ref)}`}</span>
        <SeloOrigem item={item} />
        <SeloAntigo item={item} edicaoData={edicaoData} />
        {cruzados.map((l) => (
          <Selo key={l.tipo} tom="destaque">
            {l.tipo === 'acima' ? '▲ acima de' : '▼ abaixo de'} {numeroAuto(l.valor)}
          </Selo>
        ))}
      </span>
    </button>
  );
}

function ValorKpi({ valor, unidade }: { valor: number | null | undefined; unidade?: string | null }) {
  const p = partesValor(valor, unidade);
  return (
    <span className="kpi-valor num">
      {p.prefixo && <span className="kpi-unidade">{p.prefixo} </span>}
      {p.numero}
      {p.sufixo && <span className="kpi-unidade"> {p.sufixo}</span>}
    </span>
  );
}
