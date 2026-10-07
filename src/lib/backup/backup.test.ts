import { describe, expect, it } from 'vitest';
import { PlanoDB } from '../db/db';
import { getSettings, updateSettings } from '../db/settings';
import type { Transaction } from '../db/schemas';
import { diasDesdeBackup, gerarBackup, lerBackup, restaurarBackup, resumirBackup } from './backup';

const tx = (id: string, valor = 1000): Transaction => ({
  id,
  data: '2026-10-01',
  mes: '2026-10',
  tipo: 'saida',
  categoria: 'Outros',
  descricao: 'Teste',
  estabelecimento: 'Loja',
  valor,
  forma: 'Cartão',
  origem: 'manual',
  fixoId: null,
  dedutivel: null,
  cnpj: null,
  beneficiario: null,
  reembolsado: false,
  reembolsadoEm: null,
  comprovanteId: null,
  comprovantePendente: false,
  criadoEm: '2026-10-01T00:00:00Z',
});

describe('backup', () => {
  it('gera, lê e restaura (substituir) com comprovantes', async () => {
    const a = new PlanoDB('bk-a');
    await updateSettings({ reserva: 123_45 }, a);
    await a.transactions.bulkAdd([tx('t1'), { ...tx('t2'), comprovanteId: 'r1' }]);
    await a.receipts.add({
      id: 'r1',
      criadoEm: 'x',
      tipoArquivo: 'image/jpeg',
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
    });

    const zip = await gerarBackup(a);
    const lido = await lerBackup(zip);
    expect(resumirBackup(lido)).toMatchObject({ lancamentos: 2, comprovantes: 1, meses: 1 });

    const b = new PlanoDB('bk-b');
    await b.transactions.add(tx('local'));
    await restaurarBackup(b, lido, 'substituir');
    expect(await b.transactions.count()).toBe(2);
    expect((await getSettings(b)).reserva).toBe(123_45);
    expect((await getSettings(b)).ultimoRestauro).not.toBeNull();
    const r = await b.receipts.get('r1');
    expect(new Uint8Array(await r!.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    await a.delete();
    await b.delete();
  });

  it('mesclar é idempotente e mantém dados locais', async () => {
    const a = new PlanoDB('bk-c');
    await a.transactions.bulkAdd([tx('t1'), tx('t2')]);
    const lido = await lerBackup(await gerarBackup(a));

    const b = new PlanoDB('bk-d');
    await updateSettings({ reserva: 999 }, b);
    await b.transactions.bulkAdd([{ ...tx('t1'), valor: 5555 }, tx('local')]);
    await restaurarBackup(b, lido, 'mesclar');
    await restaurarBackup(b, lido, 'mesclar');
    expect(await b.transactions.count()).toBe(3);
    expect((await b.transactions.get('t1'))!.valor).toBe(5555);
    expect((await getSettings(b)).reserva).toBe(999);
    expect(await b.keywordDictionary.count()).toBe(await a.keywordDictionary.count());
    await a.delete();
    await b.delete();
  });

  it('rejeita arquivos inválidos', async () => {
    await expect(lerBackup(new Blob(['não é zip']))).rejects.toThrow('ZIP');
  });

  it('dias desde o backup', () => {
    expect(diasDesdeBackup(null)).toBeNull();
    expect(diasDesdeBackup('2026-10-01T10:00:00Z', new Date('2026-10-08T11:00:00Z'))).toBe(7);
  });
});
