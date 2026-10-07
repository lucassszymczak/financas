import { describe, expect, it } from 'vitest';
import { PlanoDB } from '../db/db';
import type { Transaction } from '../db/schemas';
import { getSettings, updateSettings } from '../db/settings';
import { sugerirAlocacao } from '../finance/extraordinarios';
import { aplicarAlocacao, aplicarParcelas, resultadosFechados } from './acoes';

const now = new Date(2026, 9, 7, 12);

const extra: Transaction = {
  id: 'e1',
  data: '2026-10-05',
  mes: '2026-10',
  tipo: 'extra_in',
  categoria: 'PLR',
  descricao: 'PLR',
  estabelecimento: '',
  valor: 1_000_000,
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
  criadoEm: '',
  alocado: false,
};

describe('ações do plano', () => {
  it('aplica parcelas um mês por vez até o corrente', async () => {
    const db = new PlanoDB('plano-1');
    await updateSettings({ ultimoMesAplicado: '2026-09', salarioBaseLongevidade: 1_000_000, capital: 0 }, db);
    await db.debts.add({
      id: 'c',
      nome: 'Consignado',
      papel: 'consignado',
      saldo: 1_000_000,
      taxaMensal: 2,
      parcela: 100_000,
      ordem: 0,
      ativo: true,
    });
    expect(await aplicarParcelas(db, now)).toBe('2026-10');
    expect(await aplicarParcelas(db, now)).toBeNull();
    expect((await db.debts.get('c'))!.saldo).toBe(920_000);
    const s = await getSettings(db);
    expect(s).toMatchObject({ ultimoMesAplicado: '2026-10', capital: 40_000, jurosPagos: 20_000 });
    expect(await db.snapshots.get('2026-10')).toMatchObject({ jurosDoMes: 20_000 });
    await db.delete();
  });

  it('aplica a alocação de um extraordinário', async () => {
    const db = new PlanoDB('plano-2');
    await updateSettings({ reserva: 1_000_000 }, db);
    await db.debts.add({
      id: 'c',
      nome: 'Consignado',
      papel: 'consignado',
      saldo: 300_000,
      taxaMensal: 2,
      parcela: 100_000,
      ordem: 0,
      ativo: true,
    });
    await db.transactions.add(extra);
    const aloc = sugerirAlocacao(extra.valor, { reserva: 1_000_000, consignado: 300_000, cdc: 0 });
    await aplicarAlocacao(db, extra, aloc, now);
    expect((await db.debts.get('c'))!.saldo).toBe(0);
    // 500k até o piso; 300k consignado; 200k restante → 60k uso livre e 140k reserva
    expect((await getSettings(db)).reserva).toBe(1_000_000 + 500_000 + 140_000);
    const outs = await db.transactions.where('tipo').equals('extra_out').toArray();
    expect(outs.reduce((a, t) => a + t.valor, 0)).toBe(1_000_000);
    expect((await db.transactions.get('e1'))!.alocado).toBe(true);
    await db.delete();
  });

  it('média dos meses fechados', async () => {
    const db = new PlanoDB('plano-3');
    await db.transactions.bulkAdd([
      { ...extra, id: 'a', tipo: 'entrada', mes: '2026-08', valor: 100_000 },
      { ...extra, id: 'b', tipo: 'saida', mes: '2026-08', valor: 150_000 },
      { ...extra, id: 'c', tipo: 'saida', mes: '2026-09', valor: 10_000 },
    ]);
    await db.closings.bulkAdd([
      { mes: '2026-08', texto: '', criadoEm: '' },
      { mes: '2026-09', texto: '', criadoEm: '' },
    ]);
    expect(await resultadosFechados(db)).toEqual({
      meses: [
        { mes: '2026-08', resultado: -50_000 },
        { mes: '2026-09', resultado: -10_000 },
      ],
      media: -30_000,
    });
    await db.delete();
  });
});
