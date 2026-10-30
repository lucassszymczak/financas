import { describe, expect, it } from 'vitest';
import exemplo from '../schema/exemplo.json';
import { radarSchema, type Preco } from '../schema/radar';
import { nivelMapa, ordenar, rotuloAtivo } from './GrupoAtivos';
import { noticiasDoAtivo, resumoSerie } from './HistoricoAtivo';

const radar = radarSchema.parse(exemplo);
const p = (id: string, extra: Partial<Preco> = {}): Preco => ({ id, nome: id, valor: 1, ...extra });

describe('lista e mapa de ativos', () => {
  it('rótulo: ticker quando o id parece código, nome nos demais', () => {
    expect(rotuloAtivo(p('PETR4', { nome: 'Petrobras PN' }))).toEqual({ principal: 'PETR4', secundario: 'Petrobras PN' });
    expect(rotuloAtivo(p('SOJA_CBOT', { nome: 'Soja Chicago' }))).toEqual({ principal: 'Soja Chicago', secundario: null });
  });
  it('intensidade do mapa por variação (juros: 10 pb = 1%)', () => {
    expect(nivelMapa(p('A', { variacao_pct: 2.7 }))).toBe('a3');
    expect(nivelMapa(p('A', { variacao_pct: -0.45 }))).toBe('b1');
    expect(nivelMapa(p('A', { variacao_pct: -1.06 }))).toBe('b2');
    expect(nivelMapa(p('A', { variacao_pb: 25 }))).toBe('a3');
    expect(nivelMapa(p('A', { variacao_pb: -5 }))).toBe('b2');
    expect(nivelMapa(p('A', { variacao_pct: 0 }))).toBe('n0');
    expect(nivelMapa(p('A'))).toBe('n0');
  });
  it('ordena por maior alta e maior queda, vazios no fim', () => {
    const itens = [p('A', { variacao_pct: 1 }), p('B'), p('C', { variacao_pct: -2 }), p('D', { variacao_pct: 3 })];
    expect(ordenar(itens, 'alta').map((i) => i.id)).toEqual(['D', 'A', 'C', 'B']);
    expect(ordenar(itens, 'baixa').map((i) => i.id)).toEqual(['C', 'A', 'D', 'B']);
    expect(ordenar(itens, 'padrao')).toBe(itens);
  });
});

describe('detalhe do ativo', () => {
  it('acha as notícias que citam o ativo', () => {
    const ibov = radar.cotacoes.find((c) => c.id === 'IBOV')!;
    expect(noticiasDoAtivo(radar, ibov).map((n) => n.id)).toEqual(['datafolha-2026-10-15']);
    const dolar = radar.cotacoes.find((c) => c.id === 'USDBRL')!;
    expect(noticiasDoAtivo(radar, dolar).map((n) => n.id)).toContain('datafolha-2026-10-15');
    const soja = radar.agro.find((c) => c.id === 'SOJA_CBOT')!;
    expect(noticiasDoAtivo(radar, soja).map((n) => n.id)).toEqual(['conab-1-lev-2026-27']);
  });
  it('resume a série: mínimo, máximo e variação no período', () => {
    const r = resumoSerie(
      [
        { x: '2026-10-15', y: 100 },
        { x: '2026-10-16', y: 90 },
        { x: '2026-10-19', y: 110 },
      ],
      false,
    );
    expect(r).toMatchObject({ min: 90, max: 110, desde: '2026-10-15', variacao: '+10,00%', alta: true });
    expect(
      resumoSerie(
        [
          { x: '2026-10-15', y: 12.73 },
          { x: '2026-10-16', y: 12.5 },
        ],
        true,
      )?.variacao,
    ).toBe('−23 pb');
    expect(resumoSerie([{ x: '2026-10-15', y: 1 }], false)).toBeNull();
  });
});
