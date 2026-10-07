export function Regras() {
  return (
    <section className="card stack-sm" aria-labelledby="rg-titulo">
      <h2 id="rg-titulo">Regras do plano</h2>
      <h3>Ordem de uso de cada real livre</h3>
      <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>
        <li>Reserva mínima de R$ 15 mil</li>
        <li>Longevidade 6/6, se a regra permitir</li>
        <li>Quitar o consignado</li>
        <li>Reserva até R$ 30 mil</li>
        <li>Amortizar o CDC</li>
        <li>Reserva de 6 meses e investimentos</li>
      </ol>
      <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
        <li>Não contratar crédito para dívida de terceiros.</li>
        <li>Fatura sempre integral.</li>
        <li>Reembolso de trabalho não é renda.</li>
        <li>Depois do consignado, extraordinários seguem 70/30.</li>
      </ul>
    </section>
  );
}
