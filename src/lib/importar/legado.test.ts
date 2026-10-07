import { describe, expect, it } from 'vitest';
import { PlanoDB } from '../db/db';
import { defaultSettings } from '../db/defaults';
import { getSettings } from '../db/settings';
import { converterLegado, gravarLegado } from './legado';

// Amostra fictícia no formato do app anterior.
const LEGADO = {
  config: {
    fixos: [
      { tipo: 'saida', cat: 'Moradia', desc: 'Aluguel', valor: 1500 },
      { tipo: 'entrada', cat: 'Salário líquido', desc: 'Salário', valor: '5.000,00' },
    ],
    debts: {
      consig: { nome: 'Consignado X', saldo: 10000, taxa: 1.8, parcela: 500 },
      cdc: { nome: 'CDC carro', saldo: 20000, taxa: 0.015, parcela: 800 },
      mae: { nome: 'Acordo', saldo: 3000, taxa: 0, parcela: 300 },
    },
    reserva: 12000.5,
    capital: 8000,
    longev: '2/2',
    ultimoAplicado: '2026-09',
    jurosPagos: 450.25,
    historico: [{ mes: '2026-08', reserva: 11000, capital: 7600, consig: 10300, cdc: 20500, mae: 3300, juros: 190 }],
    tetos: { Restaurante: 600 },
    regras: { 'POSTO CENTRAL': { tipo: 'saida', cat: 'Combustível' }, 'Loja Y': 'Vestuário' },
    fipe: 45000,
    proj: { decimoNov: 4000, plr: 6000, janela: '2026-11' },
  },
  months: {
    '2026-09': [
      { tipo: 'saida', cat: 'Moradia', desc: 'Aluguel', valor: 1500, data: '2026-09-05', forma: 'Pix', fixoId: '0' },
      {
        tipo: 'saida',
        cat: 'Saúde',
        desc: 'Consulta',
        valor: 300,
        data: '12/09/2026',
        forma: 'Cartão',
        estab: 'Clínica',
        dedutivel: 'saude',
        cnpj: '11.222.333/0001-81',
        assetId: 'abc',
      },
      {
        tipo: 'saida',
        cat: 'Saúde',
        desc: 'Consulta',
        valor: 300,
        data: '12/09/2026',
        forma: 'Cartão',
        estab: 'Clínica',
        dedutivel: 'saude',
      },
      { tipo: 'trabalho', cat: 'Hospedagem', desc: 'Hotel', valor: 400, data: '2026-09-20', recebido: true },
      { tipo: 'extra_in', cat: 'PLR', desc: 'PLR', valor: 6000, data: '2026-09-30' },
      { tipo: '???', valor: 1 },
    ],
  },
  fech: { '2026-08': 'Fechamento de agosto' },
};

describe('importação do app anterior', () => {
  it('converte e resume', () => {
    const { plano, resumo } = converterLegado(LEGADO, defaultSettings(), new Date(2026, 9, 7));
    expect(resumo).toMatchObject({
      meses: 1,
      lancamentos: 5,
      comprovantesPendentes: 1,
      fixos: 2,
      dividas: 3,
      fechamentos: 1,
      historico: 1,
      regras: 2,
      ignorados: 1,
      reserva: 1_200_050,
      capital: 800_000,
    });
    expect(plano.settings).toMatchObject({
      jurosPagos: 45_025,
      fipeCarro: 4_500_000,
      ultimoMesAplicado: '2026-09',
      longevidadeModo: '2/2',
      tetos: { Restaurante: 60_000 },
    });
    expect(plano.settings.projecao).toMatchObject({ decimoNov: 400_000, plrMarco: 600_000, janelaLongevidade: '2026-11' });
    expect(plano.debts.map((d) => [d.papel, d.taxaMensal])).toEqual([
      ['consignado', 1.8],
      ['cdc', 1.5],
      ['acordo', 0],
    ]);
    const [aluguel, consulta, consulta2, hotel, plr] = plano.transactions;
    expect(aluguel!.fixoId).toBe(plano.fixedItems[0]!.id);
    expect(aluguel!.forma).toBe('Conta / Pix');
    expect(consulta).toMatchObject({
      data: '2026-09-12',
      dedutivel: 'saude',
      comprovantePendente: true,
      cnpj: '11.222.333/0001-81',
    });
    expect(consulta2!.id).not.toBe(consulta!.id);
    expect(hotel).toMatchObject({ tipo: 'trabalho', reembolsado: true });
    expect(plr).toMatchObject({ tipo: 'extra_in', alocado: true });
    expect(plano.snapshots[0]!.dividas.map((d) => d.saldo)).toEqual([1_030_000, 2_050_000, 330_000]);
    expect(plano.categoryRules.map((r) => [r.chave, r.categoria])).toEqual([
      ['posto central', 'Combustível'],
      ['loja', 'Vestuário'],
    ]);
  });

  it('é idempotente e preserva comprovantes anexados', async () => {
    const db = new PlanoDB('legado-1');
    const { plano } = converterLegado(LEGADO, await getSettings(db));
    await gravarLegado(db, plano);
    const consulta = plano.transactions[1]!;
    await db.transactions.update(consulta.id, { comprovanteId: 'r9', comprovantePendente: false });
    await gravarLegado(db, converterLegado(LEGADO, await getSettings(db)).plano);
    expect(await db.transactions.count()).toBe(5);
    expect(await db.debts.count()).toBe(3);
    expect((await db.transactions.get(consulta.id))!.comprovanteId).toBe('r9');
    expect((await getSettings(db)).reserva).toBe(1_200_050);
    await db.delete();
  });

  it('rejeita formato errado', () => {
    expect(() => converterLegado({ foo: 1 }, defaultSettings())).toThrow('Formato não reconhecido');
  });
});
