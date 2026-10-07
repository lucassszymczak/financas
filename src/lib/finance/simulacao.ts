import { addMonths, compareMonths, monthNumber } from '../dates';
import type { Debt, ModoLongevidade, Projecao } from '../db/schemas';
import { aplicarParcela } from './dividas';
import { contribuicaoMensal, custoExtraSubir } from './longevidade';

/** Fluxo padrão quando não há meses fechados nem valor manual: −R$ 1.200. */
export const FLUXO_PADRAO = -120_000;

export type LinhaSimulacao = {
  mes: string;
  fluxo: number;
  extraordinario: number;
  reserva: number;
  consignado: number;
  capital: number;
  dividas: { id: string; nome: string; saldo: number }[];
  modo: ModoLongevidade;
};

export type ResultadoSimulacao = {
  linhas: LinhaSimulacao[];
  fluxoBase: number;
  origemFluxo: 'manual' | 'media' | 'padrao';
  mesQuitacaoConsignado: string | null;
  reservaFinal: number;
  alertaReservaAbaixoPiso: boolean;
};

export type EntradaSimulacao = {
  /** Último mês aplicado; a simulação começa no mês seguinte. */
  ultimoMesAplicado: string;
  reserva: number;
  capital: number;
  longevidadeModo: ModoLongevidade;
  salarioBase: number;
  dividas: readonly Debt[];
  projecao: Projecao;
  /** Média dos resultados dos meses fechados (null se não houver). */
  mediaFechados: number | null;
  meses?: number;
};

export function fluxoBase(
  projecao: Projecao,
  mediaFechados: number | null,
): {
  valor: number;
  origem: 'manual' | 'media' | 'padrao';
} {
  if (projecao.resultadoManual !== null) return { valor: projecao.resultadoManual, origem: 'manual' };
  if (mediaFechados !== null) return { valor: mediaFechados, origem: 'media' };
  return { valor: FLUXO_PADRAO, origem: 'padrao' };
}

function extraordinarioDoMes(projecao: Projecao, mes: string): number {
  switch (monthNumber(mes)) {
    case 11:
      return projecao.decimoNov;
    case 12:
      return projecao.decimoDez;
    case 3:
      return projecao.plrMarco;
    case 6:
      return projecao.restituicaoJunho;
    default:
      return 0;
  }
}

/**
 * Simulação de 12 meses. Em cada mês:
 * 1. dívidas pagam a parcela (consignado com juros; acordo sem juros); a parcela de uma
 *    dívida quitada volta ao fluxo;
 * 2. o fluxo (média ou manual, menos o custo extra do 6/6 a partir da janela) entra na reserva;
 * 3. extraordinários completam a reserva até o piso, amortizam o consignado e a sobra vai para a reserva.
 */
export function simular12Meses(e: EntradaSimulacao): ResultadoSimulacao {
  const n = e.meses ?? 12;
  const base = fluxoBase(e.projecao, e.mediaFechados);
  const piso = e.projecao.pisoReserva;
  let reserva = e.reserva;
  let capital = e.capital;
  let dividas = e.dividas.filter((d) => d.ativo).map((d) => ({ ...d }));
  let mesQuitacao: string | null = null;
  const linhas: LinhaSimulacao[] = [];
  const temConsignado = dividas.some((d) => d.papel === 'consignado' && d.saldo > 0);

  for (let k = 1; k <= n; k++) {
    const mes = addMonths(e.ultimoMesAplicado, k);
    const subiu =
      e.longevidadeModo === '6/6' ||
      (e.projecao.janelaLongevidade !== null && compareMonths(mes, e.projecao.janelaLongevidade) >= 0);
    const modo: ModoLongevidade = subiu ? '6/6' : '2/2';

    // 1. Dívidas
    let parcelasLiberadas = 0;
    dividas = dividas.map((d) => {
      if (d.saldo <= 0) {
        parcelasLiberadas += d.parcela;
        return d;
      }
      const r = aplicarParcela(d);
      // Se quitou neste mês, a sobra da última parcela volta ao fluxo.
      if (r.saldo === 0) parcelasLiberadas += d.parcela - r.pago;
      return { ...d, saldo: r.saldo };
    });

    // 2. Fluxo
    let fluxo = base.valor + parcelasLiberadas;
    if (subiu && e.longevidadeModo === '2/2') fluxo -= custoExtraSubir(e.salarioBase);
    reserva += fluxo;
    capital += contribuicaoMensal(modo, e.salarioBase);

    // 3. Extraordinários
    const extra = extraordinarioDoMes(e.projecao, mes);
    if (extra > 0) {
      let resto = extra;
      const paraPiso = Math.min(resto, Math.max(0, piso - reserva));
      reserva += paraPiso;
      resto -= paraPiso;
      dividas = dividas.map((d) => {
        if (d.papel !== 'consignado' || resto <= 0 || d.saldo <= 0) return d;
        const usado = Math.min(resto, d.saldo);
        resto -= usado;
        return { ...d, saldo: d.saldo - usado };
      });
      reserva += resto;
    }

    const consignado = dividas.filter((d) => d.papel === 'consignado').reduce((a, d) => a + d.saldo, 0);
    if (temConsignado && mesQuitacao === null && consignado === 0) mesQuitacao = mes;

    linhas.push({
      mes,
      fluxo,
      extraordinario: extra,
      reserva,
      consignado,
      capital,
      dividas: dividas.map((d) => ({ id: d.id, nome: d.nome, saldo: d.saldo })),
      modo,
    });
  }

  return {
    linhas,
    fluxoBase: base.valor,
    origemFluxo: base.origem,
    mesQuitacaoConsignado: mesQuitacao,
    reservaFinal: reserva,
    alertaReservaAbaixoPiso: reserva < piso,
  };
}
