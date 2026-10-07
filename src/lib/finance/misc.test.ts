import { describe, expect, it } from 'vitest';
import { chaveEstabelecimento } from './chave';
import { ehDuplicado, marcarDuplicados } from './duplicados';
import { detectarRecorrencias } from './recorrencias';
import { statusTeto } from './tetos';

describe('chaveEstabelecimento', () => {
  it('normaliza', () => {
    expect(chaveEstabelecimento('POSTO IPIRANGA Nº 3 - São José')).toBe('posto ipiranga sao');
    expect(chaveEstabelecimento('Farmácia A Raia 123')).toBe('farmacia raia');
    expect(chaveEstabelecimento('***')).toBe('');
  });
});

describe('duplicados', () => {
  it('valor ±0,01 e até 2 dias', () => {
    expect(ehDuplicado({ valor: 1000, data: '2026-10-01' }, { valor: 1001, data: '2026-10-03' })).toBe(true);
    expect(ehDuplicado({ valor: 1000, data: '2026-10-01' }, { valor: 1002, data: '2026-10-01' })).toBe(false);
    expect(ehDuplicado({ valor: 1000, data: '2026-10-01' }, { valor: 1000, data: '2026-10-04' })).toBe(false);
  });
  it('marca contra existentes e dentro do lote', () => {
    const r = marcarDuplicados(
      [
        { valor: 500, data: '2026-10-05' },
        { valor: 700, data: '2026-10-05' },
        { valor: 700, data: '2026-10-06' },
      ],
      [{ valor: 500, data: '2026-10-04' }],
    );
    expect(r).toEqual([true, false, true]);
  });
});

describe('recorrências', () => {
  const tx = (mes: string, valor: number, estabelecimento: string, fixoId: string | null = null) => ({
    tipo: 'saida' as const,
    mes,
    valor,
    estabelecimento,
    descricao: '',
    categoria: 'Assinaturas',
    fixoId,
  });
  it('detecta valores estáveis em 2+ meses', () => {
    const r = detectarRecorrencias([
      tx('2026-08', 3990, 'NETFLIX.COM'),
      tx('2026-09', 3990, 'Netflix com'),
      tx('2026-08', 10_000, 'Loja X'),
      tx('2026-09', 30_000, 'Loja X'),
      tx('2026-08', 5000, 'Academia', 'f1'),
      tx('2026-09', 5000, 'Academia', 'f1'),
      tx('2026-09', 1000, 'Padaria'),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ chave: 'netflix com', media: 3990, custoAnual: 47_880 });
  });
});

describe('tetos', () => {
  it('ritmo e níveis', () => {
    // dia 10 de 30: ritmo = 1/3 do teto
    const a = statusTeto(40_000, 100_000, 10, 30);
    expect(a.acimaDoRitmo).toBe(true);
    expect(a.nivel).toBe('ok');
    const b = statusTeto(38_000, 100_000, 10, 30);
    expect(b.acimaDoRitmo).toBe(false);
    expect(statusTeto(85_000, 100_000, 30, 30).nivel).toBe('amarelo');
    expect(statusTeto(100_001, 100_000, 30, 30).nivel).toBe('vermelho');
    expect(statusTeto(100_000, 100_000, 30, 30).nivel).toBe('amarelo');
  });
});
