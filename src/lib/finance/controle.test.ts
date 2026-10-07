import { describe, expect, it } from 'vitest';
import { eventosDoMes, proximosEventos } from './calendario';
import { acaoSugerida, gerarFechamento, maioresDesvios } from './fechamento';
import { efeito66, trocarCarro } from './simulador';

const s = (categoria: string, valor: number) => ({ tipo: 'saida' as const, categoria, valor });

describe('fechamento', () => {
  const atual = [
    s('Restaurante', 80_000),
    s('Mercado', 100_000),
    s('Lazer', 30_000),
    s('Farmácia', 5_000),
    { tipo: 'entrada' as const, categoria: 'Salário líquido', valor: 300_000 },
  ];
  const anterior = [s('Restaurante', 50_000), s('Mercado', 95_000), s('Farmácia', 10_000)];

  it('três maiores desvios (mês anterior ou teto)', () => {
    const d = maioresDesvios(atual, anterior, { Mercado: 60_000 });
    expect(d.map((x) => [x.categoria, x.diferenca, x.base])).toEqual([
      ['Mercado', 40_000, 'teto'],
      ['Restaurante', 30_000, 'mes_anterior'],
      ['Lazer', 30_000, 'mes_anterior'],
    ]);
  });

  it('ação sugerida', () => {
    expect(acaoSugerida([], {})).toContain('Manter');
    expect(acaoSugerida(maioresDesvios(atual, anterior, {}), {})).toBe(
      'Criar teto para Restaurante: sugestão de R$ 500 por mês.',
    );
    expect(acaoSugerida(maioresDesvios(atual, anterior, { Mercado: 60_000 }), { Mercado: 60_000 })).toContain('estourou o teto');
  });

  it('texto do fechamento', () => {
    const t = gerarFechamento({ mes: '2026-09', txs: atual, txsAnterior: anterior, tetos: {}, modo: '2/2' });
    expect(t).toContain('Fechamento de setembro de 2026');
    expect(t).toContain('Resultado: +R$ 850,00');
    expect(t).toContain('Pode subir para 6/6 em novembro de 2026');
    expect(t).toContain('1. Restaurante');
    expect(t).toContain('Ação sugerida: Criar teto para Restaurante');
  });
});

describe('calendário', () => {
  it('eventos fixos', () => {
    expect(eventosDoMes('2026-10').map((e) => e.data)).toEqual(['2026-10-01', '2026-10-11', '2026-10-25']);
    const nov = eventosDoMes('2026-11').map((e) => e.titulo);
    expect(nov).toContain('Janela do Longevidade');
    expect(nov).toContain('13º salário (1ª parcela)');
    expect(eventosDoMes('2026-12').some((e) => e.data === '2026-12-20')).toBe(true);
    expect(eventosDoMes('2027-03').map((e) => e.titulo)).toEqual(
      expect.arrayContaining(['PLR neste mês', 'Declaração do IR: separar comprovantes']),
    );
    expect(eventosDoMes('2027-02').find((e) => e.titulo.includes('CDC'))!.data).toBe('2027-02-25');
  });
  it('próximos eventos com backup semanal', () => {
    const ev = proximosEventos('2026-10-07', 20, '2026-10-05T10:00:00Z');
    expect(ev[0]).toEqual({ data: '2026-10-11', titulo: 'Fatura do cartão (integral)', tipo: 'pagamento' });
    expect(ev.filter((e) => e.titulo === 'Backup semanal').map((e) => e.data)).toEqual([
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ]);
  });
});

describe('simulador', () => {
  it('troca de carro', () => {
    expect(trocarCarro({ fipe: 5_000_000, saldoCdc: 2_000_000, compraAVista: 2_000_000 })).toEqual({
      venda: 4_500_000,
      quitacao: 2_000_000,
      saldo: 500_000,
    });
  });
  it('6/6 em 12 meses', () => {
    expect(efeito66(1_000_000)).toEqual({ custoParaVoce: 480_000, capitalExtra: 960_000 });
  });
});
