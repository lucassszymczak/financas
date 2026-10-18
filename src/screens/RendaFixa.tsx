import { useRadar } from '../state';
import { categoria } from '../lib/categorias';
import { numero } from '../lib/formato';
import { Leitura } from '../components/Basicos';
import { Abas, ABAS_RENDA_FIXA } from '../components/Abas';
import { Categoria } from './Categoria';

/** Renda fixa: taxas de referência e as listas de Curva DI, Tesouro Direto e juros no mundo. */
export function RendaFixa({ sub }: { sub: string | null }) {
  const { radar } = useRadar();
  const t = radar.taxas_referencia;
  const cat = categoria(sub);
  const taxa = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${numero(v, 2)}%`);
  return (
    <div className="tela">
      <Abas aba="renda-fixa" itens={ABAS_RENDA_FIXA} atual={cat ? sub : null} />
      {cat ? (
        <Categoria id={cat.id} />
      ) : (
        <>
          <Leitura titulo="Leitura dos juros" texto={radar.leituras_secao?.juros ?? radar.leituras_secao?.renda_fixa} destaque />
          <div className="taxas-kpis num">
            <div className="taxa-kpi">
              <span className="taxa-rotulo">Selic meta</span>
              <span className="taxa-valor">{taxa(t?.selic_meta)}</span>
            </div>
            <div className="taxa-kpi">
              <span className="taxa-rotulo">CDI</span>
              <span className="taxa-valor">{taxa(t?.cdi_anual)}</span>
              <span className="mudo">ao ano</span>
            </div>
            <div className="taxa-kpi">
              <span className="taxa-rotulo">IPCA 12 meses</span>
              <span className="taxa-valor">{taxa(t?.ipca_12m)}</span>
            </div>
          </div>
          {!t && <p className="mudo">Esta edição não trouxe o bloco de taxas de referência.</p>}
        </>
      )}
    </div>
  );
}
