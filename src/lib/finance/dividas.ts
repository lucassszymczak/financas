import { addMonths, compareMonths } from '../dates';
import type { Debt, ModoLongevidade, Snapshot } from '../db/schemas';
import { contribuicaoMensal } from './longevidade';

type DebtCore = Pick<Debt, 'saldo' | 'taxaMensal' | 'parcela'>;

/** Aplica uma parcela: com juros, saldo = max(0, saldo × (1 + i) − parcela); sem juros, saldo − parcela. */
export function aplicarParcela(d: DebtCore): { saldo: number; juros: number; pago: number } {
  if (d.saldo <= 0) return { saldo: 0, juros: 0, pago: 0 };
  const i = d.taxaMensal / 100;
  const juros = i > 0 ? Math.round(d.saldo * i) : 0;
  const devido = d.saldo + juros;
  const pago = Math.min(d.parcela, devido);
  return { saldo: Math.max(0, devido - d.parcela), juros, pago };
}

/** Meses restantes até quitar. Infinity se a parcela não cobre os juros. */
export function mesesRestantes(d: DebtCore): number {
  if (d.saldo <= 0) return 0;
  if (d.parcela <= 0) return Infinity;
  const i = d.taxaMensal / 100;
  if (i <= 0) return Math.ceil(d.saldo / d.parcela);
  const x = 1 - (d.saldo * i) / d.parcela;
  if (x <= 0) return Infinity;
  return Math.ceil(-Math.log(x) / Math.log(1 + i) - 1e-9);
}

/** Mês previsto de término, contando a partir do mês seguinte ao último aplicado. */
export function mesTermino(d: DebtCore, ultimoMesAplicado: string): string | null {
  const n = mesesRestantes(d);
  if (!Number.isFinite(n)) return null;
  return addMonths(ultimoMesAplicado, n);
}

/** Próximo mês a aplicar; null se já chegou ao mês corrente. */
export function proximoMesAplicavel(ultimoMesAplicado: string | null, mesCorrente: string): string | null {
  const proximo = ultimoMesAplicado ? addMonths(ultimoMesAplicado, 1) : mesCorrente;
  return compareMonths(proximo, mesCorrente) <= 0 ? proximo : null;
}

export type EstadoPlano = {
  capital: number;
  jurosPagos: number;
  reserva: number;
  longevidadeModo: ModoLongevidade;
  salarioBaseLongevidade: number;
  ultimoMesAplicado: string | null;
};

/** Aplica as parcelas de um mês a todas as dívidas ativas e grava o snapshot. */
export function aplicarParcelasDoMes(
  estado: EstadoPlano,
  dividas: readonly Debt[],
  mes: string,
): { estado: EstadoPlano; dividas: Debt[]; snapshot: Snapshot } {
  let jurosDoMes = 0;
  const novas = dividas.map((d) => {
    if (!d.ativo) return d;
    const r = aplicarParcela(d);
    jurosDoMes += r.juros;
    return { ...d, saldo: r.saldo };
  });
  const capital = estado.capital + contribuicaoMensal(estado.longevidadeModo, estado.salarioBaseLongevidade);
  const novoEstado: EstadoPlano = {
    ...estado,
    capital,
    jurosPagos: estado.jurosPagos + jurosDoMes,
    ultimoMesAplicado: mes,
  };
  return {
    estado: novoEstado,
    dividas: novas,
    snapshot: {
      mes,
      reserva: estado.reserva,
      capital,
      dividas: novas.map((d) => ({ id: d.id, nome: d.nome, saldo: d.saldo })),
      jurosDoMes,
    },
  };
}

/** Amortização extra: reduz o saldo (sem passar de zero). */
export function amortizar(d: DebtCore, valor: number): { saldo: number; usado: number } {
  const usado = Math.min(Math.max(valor, 0), d.saldo);
  return { saldo: d.saldo - usado, usado };
}

/** Efeito de uma amortização: parcelas e juros evitados (mantendo a parcela). */
export function efeitoAmortizacao(
  d: DebtCore,
  valor: number,
): {
  mesesAntes: number;
  mesesDepois: number;
  parcelasEvitadas: number;
  jurosAntes: number;
  jurosDepois: number;
  jurosEvitados: number;
} {
  const antes = jurosTotais(d);
  const depoisDebt = { ...d, saldo: amortizar(d, valor).saldo };
  const depois = jurosTotais(depoisDebt);
  const mesesAntes = mesesRestantes(d);
  const mesesDepois = mesesRestantes(depoisDebt);
  return {
    mesesAntes,
    mesesDepois,
    parcelasEvitadas: Number.isFinite(mesesAntes) ? mesesAntes - mesesDepois : Infinity,
    jurosAntes: antes,
    jurosDepois: depois,
    jurosEvitados: antes - depois,
  };
}

/** Juros totais até quitar (simulação mês a mês, limite de 600 meses). */
export function jurosTotais(d: DebtCore): number {
  let saldo = d.saldo;
  let total = 0;
  for (let k = 0; k < 600 && saldo > 0; k++) {
    const r = aplicarParcela({ ...d, saldo });
    total += r.juros;
    if (r.saldo >= saldo && r.juros > 0) return Infinity;
    saldo = r.saldo;
  }
  return total;
}
