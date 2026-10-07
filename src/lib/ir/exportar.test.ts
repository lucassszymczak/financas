import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { PlanoDB } from '../db/db';
import type { Transaction } from '../db/schemas';
import { csvDedutiveis, csvLancamentos, nomeComprovante, nomesUnicos, totaisIR, zipComprovantesAno } from './exportar';

const base: Transaction = {
  id: 't',
  data: '2026-03-10',
  mes: '2026-03',
  tipo: 'saida',
  categoria: 'Saúde',
  descricao: 'Consulta; retorno',
  estabelecimento: 'Clínica Ávila',
  valor: 35_050,
  forma: 'Conta / Pix',
  origem: 'foto',
  fixoId: null,
  dedutivel: 'saude',
  cnpj: '11.222.333/0001-81',
  beneficiario: 'Clínica Ávila',
  reembolsado: false,
  reembolsadoEm: null,
  comprovanteId: 'r1',
  comprovantePendente: false,
  criadoEm: '',
  alocado: false,
};

const txs: Transaction[] = [
  base,
  {
    ...base,
    id: 'e',
    data: '2026-02-01',
    mes: '2026-02',
    categoria: 'Escola',
    dedutivel: 'educacao',
    valor: 100_000,
    beneficiario: 'Colégio X',
    comprovanteId: null,
    comprovantePendente: true,
  },
  { ...base, id: 'n', dedutivel: null, categoria: 'Mercado (além do VA)', valor: 1_000, comprovanteId: null },
  { ...base, id: 'old', data: '2025-12-01', mes: '2025-12' },
];

describe('IR', () => {
  it('totais do ano', () => {
    expect(totaisIR(txs, 2026)).toEqual({ saude: 35_050, educacao: 100_000 });
  });

  it('CSV com BOM, ; e vírgula decimal', () => {
    const csv = csvDedutiveis(txs, 2026);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const linhas = csv.slice(1).trim().split('\r\n');
    expect(linhas[0]).toBe('Data;Tipo;Beneficiário;CNPJ/CPF;Valor;Descrição;Comprovante');
    expect(linhas[1]).toBe(
      '01/02/2026;Educação;Colégio X;11.222.333/0001-81;1000,00;Consulta; retorno;pendente'.replace(
        'Consulta; retorno',
        '"Consulta; retorno"',
      ),
    );
    expect(linhas[2]).toContain('350,50');
    expect(linhas[2]).toContain('2026-03-10_clinica-avila_350,50.jpg');
    expect(csvLancamentos(txs, 2026).trim().split('\r\n')).toHaveLength(4);
  });

  it('nomes de comprovante', () => {
    expect(nomeComprovante(base)).toBe('2026-03-10_clinica-avila_350,50.jpg');
    expect(nomesUnicos(['a.jpg', 'a.jpg', 'b.jpg', 'a.jpg'])).toEqual(['a.jpg', 'a_2.jpg', 'b.jpg', 'a_3.jpg']);
  });

  it('ZIP do ano', async () => {
    const db = new PlanoDB('ir-1');
    await db.transactions.bulkAdd(txs);
    await db.receipts.add({
      id: 'r1',
      criadoEm: '',
      tipoArquivo: 'image/jpeg',
      blob: new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
    });
    const r = await zipComprovantesAno(db, 2026);
    expect(r.quantidade).toBe(1);
    const zip = await JSZip.loadAsync(await r.blob.arrayBuffer());
    expect(Object.keys(zip.files)).toEqual(['2026-03-10_clinica-avila_350,50.jpg']);
    await db.delete();
  });
});
