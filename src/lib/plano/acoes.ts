import type { PlanoDB } from '../db/db';
import type { Debt, PapelDivida, Transaction } from '../db/schemas';
import { getSettings, updateSettings } from '../db/settings';
import { currentMonth } from '../dates';
import { aplicarParcelasDoMes, proximoMesAplicavel } from '../finance/dividas';
import { DESTINO_CATEGORIA, type Alocacao } from '../finance/extraordinarios';
import { resultadoMes } from '../finance/resultado';
import { mediaResultados } from '../finance/resultado';
import { newId } from '../id';

/** Aplica as parcelas do próximo mês (um por vez, sem passar do mês corrente). */
export async function aplicarParcelas(database: PlanoDB, now = new Date()): Promise<string | null> {
  return database.transaction('rw', database.settings, database.debts, database.snapshots, async () => {
    const s = await getSettings(database);
    const mes = proximoMesAplicavel(s.ultimoMesAplicado, currentMonth(now));
    if (!mes) return null;
    const dividas = await database.debts.orderBy('ordem').toArray();
    const r = aplicarParcelasDoMes(s, dividas, mes);
    await database.debts.bulkPut(r.dividas);
    await database.snapshots.put(r.snapshot);
    await updateSettings({ capital: r.estado.capital, jurosPagos: r.estado.jurosPagos, ultimoMesAplicado: mes }, database);
    return mes;
  });
}

export async function moverReserva(database: PlanoDB, delta: number): Promise<void> {
  await updateSettings((s) => ({ reserva: s.reserva + delta }), database);
}

export async function amortizarDivida(database: PlanoDB, id: string, valor: number): Promise<number> {
  return database.transaction('rw', database.debts, async () => {
    const d = await database.debts.get(id);
    if (!d) return 0;
    const usado = Math.min(Math.max(0, valor), d.saldo);
    await database.debts.update(id, { saldo: d.saldo - usado });
    return usado;
  });
}

export async function corrigirSaldo(database: PlanoDB, id: string, saldo: number): Promise<void> {
  await database.debts.update(id, { saldo: Math.max(0, saldo) });
}

/** Saldo somado das dívidas ativas de um papel. */
export function saldoPorPapel(dividas: readonly Debt[], papel: PapelDivida): number {
  return dividas.filter((d) => d.ativo && d.papel === papel).reduce((a, d) => a + d.saldo, 0);
}

/**
 * Aplica o destino de um extraordinário: cria os lançamentos extra_out, soma à reserva,
 * amortiza as dívidas (em ordem) e marca o extraordinário como alocado.
 */
export async function aplicarAlocacao(
  database: PlanoDB,
  extra: Transaction,
  alocacoes: readonly Alocacao[],
  now = new Date(),
): Promise<void> {
  await database.transaction('rw', database.transactions, database.debts, database.settings, async () => {
    const criadoEm = now.toISOString();
    let reserva = 0;
    const dividas = (await database.debts.orderBy('ordem').toArray()).filter((d) => d.ativo);
    for (const a of alocacoes) {
      if (a.valor <= 0) continue;
      if (a.destino === 'reserva') reserva += a.valor;
      if (a.destino === 'consignado' || a.destino === 'cdc') {
        let resto = a.valor;
        for (const d of dividas) {
          if (d.papel !== a.destino || resto <= 0) continue;
          const usado = Math.min(resto, d.saldo);
          d.saldo -= usado;
          resto -= usado;
        }
      }
      await database.transactions.add({
        id: newId(),
        data: extra.data,
        mes: extra.mes,
        tipo: 'extra_out',
        categoria: DESTINO_CATEGORIA[a.destino],
        descricao: `${a.motivo} (${extra.categoria})`,
        estabelecimento: '',
        valor: a.valor,
        forma: 'Conta / Pix',
        origem: 'manual',
        fixoId: null,
        dedutivel: null,
        cnpj: null,
        beneficiario: null,
        reembolsado: false,
        reembolsadoEm: null,
        comprovanteId: null,
        comprovantePendente: false,
        criadoEm,
        alocado: false,
      });
    }
    await database.debts.bulkPut(dividas);
    if (reserva) await updateSettings((s) => ({ reserva: s.reserva + reserva }), database);
    await database.transactions.update(extra.id, { alocado: true });
  });
}

/** Resultado dos meses com fechamento salvo e a média deles. */
export async function resultadosFechados(
  database: PlanoDB,
): Promise<{ meses: { mes: string; resultado: number }[]; media: number | null }> {
  const fechados = (await database.closings.toArray()).map((c) => c.mes).sort();
  const meses = [];
  for (const mes of fechados) {
    const txs = await database.transactions.where('mes').equals(mes).toArray();
    meses.push({ mes, resultado: resultadoMes(txs).resultado });
  }
  return { meses, media: mediaResultados(meses.map((m) => m.resultado)) };
}
