import { describe, expect, it } from 'vitest';
import { PlanoDB } from '../db/db';
import { candidatoVazio, criarCandidato } from './candidato';
import { carregarContexto, confirmarFila, lancarFixosDoMes, limitarRegras, marcarDuplicadosNaFila } from './fila';

const now = new Date(2026, 9, 7, 12);

describe('fila de revisão', () => {
  it('cria candidatos categorizados, desmarca ignoráveis e guarda dedutíveis', async () => {
    const database = new PlanoDB('fila-1');
    const ctx = await carregarContexto(database);
    const a = criarCandidato(
      { valor: 25_000, data: '2026-10-05', descricao: 'Consulta', estabelecimento: 'Clínica Bem Estar', origem: 'foto' },
      ctx,
    );
    expect(a).toMatchObject({ categoria: 'Saúde', dedutivel: 'saude', guardarFoto: true, selecionado: true });
    const b = criarCandidato({ valor: 100_000, data: '2026-10-05', descricao: 'PAGAMENTO DE FATURA', origem: 'extrato' }, ctx);
    expect(b).toMatchObject({ ignoravel: 'fatura', selecionado: false });
    const c = criarCandidato({ valor: 40_000, data: '2026-10-05', descricao: 'show', tipo: 'entrada', origem: 'texto' }, ctx);
    expect(c).toMatchObject({ tipo: 'entrada', categoria: 'Outras entradas' });
    await database.delete();
  });

  it('marca duplicados contra o banco e a fila', async () => {
    const database = new PlanoDB('fila-2');
    const ctx = await carregarContexto(database);
    await lancarFixosDoMes(database, '2026-10', now);
    await database.transactions.add({
      id: 'x',
      data: '2026-10-04',
      mes: '2026-10',
      tipo: 'saida',
      categoria: 'Outros',
      descricao: '',
      estabelecimento: '',
      valor: 5_000,
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
      criadoEm: '',
      alocado: false,
    });
    const novos = [
      criarCandidato({ valor: 5_000, data: '2026-10-05', descricao: 'a', origem: 'texto' }, ctx),
      criarCandidato({ valor: 7_000, data: '2026-10-05', descricao: 'b', origem: 'texto' }, ctx),
      criarCandidato({ valor: 7_000, data: '2026-10-06', descricao: 'c', origem: 'texto' }, ctx),
    ];
    const r = await marcarDuplicadosNaFila(database, novos, []);
    expect(r.map((c) => c.duplicado)).toEqual([true, false, true]);
    expect(r.map((c) => c.selecionado)).toEqual([false, true, false]);
    await database.delete();
  });

  it('confirma, guarda foto, marca comprovante pendente e aprende correções', async () => {
    const database = new PlanoDB('fila-3');
    const ctx = await carregarContexto(database);
    const foto = new Blob([new Uint8Array([9])], { type: 'image/jpeg' });
    const comFoto = {
      ...criarCandidato(
        { valor: 1_000, data: '2026-10-05', descricao: 'x', estabelecimento: 'Loja Alfa', origem: 'foto', imagem: foto },
        ctx,
      ),
    };
    comFoto.categoria = 'Vestuário';
    comFoto.guardarFoto = true;
    const descartada = {
      ...criarCandidato(
        { valor: 2_000, data: '2026-10-05', descricao: 'y', estabelecimento: 'Loja Beta', origem: 'foto', imagem: foto },
        ctx,
      ),
      guardarFoto: false,
    };
    const dedutivelSemFoto = criarCandidato(
      { valor: 3_000, data: '2026-10-05', descricao: 'Consulta', estabelecimento: 'Clínica X', origem: 'texto' },
      ctx,
    );
    const naoSelecionado = { ...candidatoVazio('2026-10-05'), valor: 999, selecionado: false };
    const semValor = candidatoVazio('2026-10-05');

    const r = await confirmarFila(database, [comFoto, descartada, dedutivelSemFoto, naoSelecionado, semValor], now);
    expect(r.salvos).toBe(3);
    expect(r.regrasAprendidas).toBe(1);
    expect(await database.receipts.count()).toBe(1);
    const txs = await database.transactions.toArray();
    expect(txs.find((t) => t.estabelecimento === 'Loja Alfa')!.comprovanteId).not.toBeNull();
    expect(txs.find((t) => t.estabelecimento === 'Clínica X')!.comprovantePendente).toBe(true);
    expect((await database.categoryRules.get('loja alfa'))!.categoria).toBe('Vestuário');

    const ctx2 = await carregarContexto(database);
    expect(
      criarCandidato({ valor: 1, data: '2026-10-06', descricao: '', estabelecimento: 'LOJA ALFA', origem: 'foto' }, ctx2),
    ).toMatchObject({
      categoria: 'Vestuário',
      fonteCategoria: 'regra',
    });
    await database.delete();
  });

  it('limita regras a 300 removendo as mais antigas', async () => {
    const database = new PlanoDB('fila-4');
    await database.categoryRules.bulkAdd(
      Array.from({ length: 305 }, (_, i) => ({
        chave: `r${i}`,
        tipo: 'saida' as const,
        categoria: 'Outros',
        atualizadoEm: `2026-01-01T00:00:${String(i).padStart(3, '0')}`,
      })),
    );
    await limitarRegras(database);
    expect(await database.categoryRules.count()).toBe(300);
    expect(await database.categoryRules.get('r0')).toBeUndefined();
    expect(await database.categoryRules.get('r304')).toBeDefined();
    await database.delete();
  });

  it('lança fixos do mês sem duplicar', async () => {
    const database = new PlanoDB('fila-5');
    await database.fixedItems.bulkAdd([
      { id: 'f1', tipo: 'saida', categoria: 'Moradia', descricao: 'Aluguel', valor: 100_000, ativo: true },
      { id: 'f2', tipo: 'entrada', categoria: 'Salário líquido', descricao: 'Salário', valor: 500_000, ativo: true },
      { id: 'f3', tipo: 'saida', categoria: 'Seguros', descricao: 'Seguro', valor: 10_000, ativo: false },
    ]);
    expect(await lancarFixosDoMes(database, '2026-10', now)).toBe(2);
    expect(await lancarFixosDoMes(database, '2026-10', now)).toBe(0);
    expect(await lancarFixosDoMes(database, '2026-09', now)).toBe(2);
    const set = await database.transactions.where('mes').equals('2026-09').toArray();
    expect(set.every((t) => t.data === '2026-09-01' && t.origem === 'fixo')).toBe(true);
    await database.delete();
  });
});
