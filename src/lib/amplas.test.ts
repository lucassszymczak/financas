import { describe, expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/radar_2026-10-20.json';
import { radarSchema } from '../schema/radar';
import { validarRadar } from './validar';
import { cotacoesAmplas, mapaPrecos, precosCurados, todosPrecos } from './precos';
import { buscarAtivos } from './busca';
import { calcularAlertas } from './alertas';
import { montarWatchlist } from './watchlist';
import { WATCHLIST_PADRAO } from './config';
import { extrasDoAtivo, volume } from '../components/HistoricoAtivo';

const radar = radarSchema.parse(fixture);

describe('cotações amplas', () => {
  it('o bloco é opcional e validado', () => {
    expect(validarRadar(fixture).ok).toBe(true);
    const ruim = structuredClone(fixture) as { cotacoes_amplas: { itens: Record<string, unknown>[] } };
    ruim.cotacoes_amplas.itens[0]!.valor = '41,20';
    const r = validarRadar(ruim);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros[0]).toBe('cotacoes_amplas.itens[0].valor: esperado número, veio texto');
  });

  it('itens herdam data e fonte do bloco; o Radar curado tem prioridade no mesmo id', () => {
    const amplas = cotacoesAmplas(radar);
    const wege = amplas.find((p) => p.id === 'WEGE3')!;
    expect(wege.data_ref).toBe('2026-10-19');
    expect(wege.fonte).toBe('Fonte de teste');
    expect(wege.nota_fonte).toBe(4);
    expect(amplas.find((p) => p.id === 'BTC')!.data_ref).toBe('2026-10-20');
    expect(amplas.some((p) => p.id === 'IBOV')).toBe(false);
    expect(mapaPrecos(radar).get('IBOV')!.nome).toBe('Ibovespa');
    expect(todosPrecos(radar).length).toBe(precosCurados(radar).length + amplas.length);
  });

  it('preenchem a watchlist que antes ficava "sem dado hoje"', () => {
    const w = montarWatchlist(WATCHLIST_PADRAO, mapaPrecos(radar));
    const dom = w.find((g) => g.nome === 'Índices domésticos')!;
    expect(dom.itens.map((i) => i.id)).toContain('SMLL');
    expect(dom.ausentes).not.toContain('SMLL');
  });

  it('não entram no resumo de dado antigo', () => {
    const a = calcularAlertas(radar, []).find((x) => x.origem === 'antigo');
    expect(a?.texto ?? '').not.toMatch(/WEG|Bradesco|DAX/);
  });
});

describe('busca de ativos', () => {
  const todos = todosPrecos(radar);
  it('código exato primeiro, depois prefixo, depois nome/setor', () => {
    expect(buscarAtivos(todos, 'wege3').map((p) => p.id)).toEqual(['WEGE3']);
    expect(buscarAtivos(todos, 'PETR')[0]!.id).toBe('PETR4');
    expect(buscarAtivos(todos, 'petroleo').map((p) => p.id)).toEqual(expect.arrayContaining(['PRIO3', 'BRENT']));
    expect(buscarAtivos(todos, 'financeiro').map((p) => p.id)).toEqual(expect.arrayContaining(['BBDC4', 'IFNC']));
    expect(buscarAtivos(todos, '   ')).toEqual([]);
  });
});

describe('dados extras do pregão', () => {
  it('monta os campos que vierem', () => {
    const wege = mapaPrecos(radar).get('WEGE3')!;
    const extras = Object.fromEntries(extrasDoAtivo(wege).map(([r, v]) => [r, v]));
    expect(extras['Mínima · máxima do dia']).toBe('40,70 · 41,50');
    expect(extras['Volume financeiro']).toBe('R$ 612,0 mi');
    expect(extras['No ano']).toBe('−5,40%');
    expect(extras['Faixa de 52 semanas']).toBe('35,10 · 48,90');
    expect(extras['Setor']).toBe('Bens industriais');
    expect(extrasDoAtivo(mapaPrecos(radar).get('BBDC4')!).map(([r]) => r)).toEqual(['Setor']);
  });
  it('volume abreviado', () => {
    expect(volume(1_234_000_000)).toBe('R$ 1,23 bi');
    expect(volume(12_500)).toBe('R$ 13 mil');
  });
});
