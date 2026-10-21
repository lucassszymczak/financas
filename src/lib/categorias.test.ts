import { describe, expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/radar_2026-10-20.json';
import { radarSchema, type Preco } from '../schema/radar';
import {
  agruparSetores,
  agruparTiposFii,
  tipoFii,
  buscarSetores,
  itensCategoria,
  itensFita,
  mediaSimples,
  opacidadeSetor,
  opcoesFita,
  setorDe,
  variacaoNumero,
} from './categorias';

const radar = radarSchema.parse(fixture);

const acao = (id: string, variacao_pct: number | null, setor?: string): Preco =>
  ({ id, nome: id, grupo: 'acoes_ibov', valor: 10, unidade: 'R$', variacao_pct, setor }) as Preco;

describe('setores', () => {
  it('agrupa por setor com média simples, altas e baixas', () => {
    const s = agruparSetores([
      acao('AAAA3', 2, 'Financeiro'),
      acao('BBBB3', -1, 'Financeiro'),
      acao('CCCC3', null, 'Financeiro'),
      acao('DDDD3', 0, 'Saúde'),
      acao('EEEE3', 1),
      { ...acao('IBOV', 1, 'Financeiro'), grupo: 'indices_br' },
    ]);
    expect(s.map((x) => x.setor)).toEqual(['Financeiro', 'Saúde']);
    const fin = s[0]!;
    expect(fin.itens.map((i) => i.id)).toEqual(['AAAA3', 'BBBB3', 'CCCC3']);
    expect(fin.media).toBeCloseTo(0.5);
    expect([fin.altas, fin.baixas]).toEqual([1, 1]);
    expect(s[1]!.media).toBe(0);
  });
  it('média ignora quem veio sem variação e é null sem nenhum dado', () => {
    expect(mediaSimples([acao('A', null), acao('B', null)])).toBeNull();
    expect(mediaSimples([acao('A', 3), acao('B', null), acao('C', 1)])).toBe(2);
    expect(variacaoNumero({ variacao_pb: 25 })).toBe(0.25);
  });
  it('o setor do arquivo tem prioridade; sem ele, usa a carteira do Ibovespa', () => {
    expect(setorDe(acao('PETR4', 1))).toBe('Petróleo, gás e biocombustíveis');
    expect(setorDe(acao('PETR4', 1, 'Energia'))).toBe('Energia');
    expect(setorDe(acao('XPTO3', 1))).toBeNull();
  });
  it('setores e busca a partir do arquivo', () => {
    const nomes = agruparSetores(radar.cotacoes_amplas!.itens.map((i) => ({ ...i, nome: i.id }) as Preco)).map((s) => s.setor);
    expect(nomes).toContain('Bens industriais');
    expect(buscarSetores(radar, 'financ').map((s) => s.setor)).toEqual(['Financeiro']);
  });
  it('tingido cresce com a variação até 0,32', () => {
    expect(opacidadeSetor(null)).toBe(0);
    expect(opacidadeSetor(0.7)).toBeCloseTo(0.15);
    expect(opacidadeSetor(-10)).toBe(0.32);
  });
});

describe('categorias e fita', () => {
  it('categorias pelo grupo', () => {
    expect(itensCategoria(radar, 'indices_br').map((p) => p.id)).toContain('SMLL');
    expect(itensCategoria(radar, 'acoes').every((p) => (p.grupo ?? '').startsWith('acoes'))).toBe(true);
    expect(itensCategoria(radar, 'di').length).toBe(3);
  });
  it('opções da fita incluem cada setor', () => {
    const o = opcoesFita(radar);
    expect(o[0]).toEqual({ valor: 'principais', nome: 'Principais', grupo: 'Geral' });
    expect(o.filter((x) => x.grupo === 'Setores').map((x) => x.nome)).toContain('Financeiro');
  });
  it('itens da fita por opção', () => {
    expect(itensFita(radar, 'principais').some((p) => p.id === 'WEGE3')).toBe(false);
    expect(itensFita(radar, 'acoes').some((p) => p.id === 'WEGE3')).toBe(true);
    expect(itensFita(radar, 'setor:Bens industriais').map((p) => p.id)).toContain('WEGE3');
    expect(itensFita(radar, 'juros').every((p) => (p.grupo ?? '').startsWith('juros'))).toBe(true);
    expect(itensFita(radar, 'agro')).toEqual(radar.agro);
  });
});

describe('FIIs por tipo', () => {
  const fii = (id: string, variacao_pct: number | null, setor?: string): Preco => ({
    id,
    nome: id,
    grupo: 'fiis',
    valor: 100,
    variacao_pct,
    ...(setor ? { setor } : {}),
  });
  it('usa o tipo do arquivo (com sinônimos) e, sem ele, a lista conhecida', () => {
    expect(tipoFii(fii('HGLG11', 1))).toBe('Logística');
    expect(tipoFii(fii('KNCR11', 1))).toBe('Recebíveis (papel)');
    expect(tipoFii(fii('XPML11', 1))).toBe('Shoppings');
    expect(tipoFii(fii('HGLG11', 1, 'Lajes Corporativas'))).toBe('Lajes corporativas');
    expect(tipoFii(fii('ABCD11', 1, 'Títulos e Val. Mob.'))).toBe('Recebíveis (papel)');
    expect(tipoFii(fii('ABCD11', 1, 'FOF'))).toBe('Fundo de fundos');
    expect(tipoFii(fii('ABCD11', 1, 'Galpões logísticos'))).toBe('Logística');
    expect(tipoFii(fii('ZZZZ11', 1))).toBe('Outros FIIs');
  });
  it('agrupa com média, altas e baixas; "Outros FIIs" por último; ações ficam de fora', () => {
    const g = agruparTiposFii([
      fii('HGLG11', 1),
      fii('BTLG11', -0.5),
      fii('KNCR11', 0.2),
      fii('ZZZZ11', 0.1),
      { id: 'PETR4', nome: 'Petrobras', grupo: 'acoes_ibov', valor: 30, variacao_pct: 1 },
    ]);
    expect(g.map((t) => t.setor)).toEqual(['Logística', 'Recebíveis (papel)', 'Outros FIIs']);
    expect(g[0]).toMatchObject({ altas: 1, baixas: 1, media: 0.25 });
  });
  it('a fita ganha "Todos os FIIs" e uma opção por tipo', () => {
    const r = radarSchema.parse(fixture);
    const opcoes = opcoesFita(r).filter((o) => o.grupo === 'FIIs');
    expect(opcoes.map((o) => o.valor)).toEqual(['fiis', 'fii:Recebíveis (papel)']);
    expect(itensFita(r, 'fii:Recebíveis (papel)').map((p) => p.id)).toEqual(['MXRF11']);
  });
});
