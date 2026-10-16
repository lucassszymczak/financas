import { describe, expect, it } from 'vitest';
import type { Preco } from '../schema/radar';
import { montarWatchlist } from './watchlist';
import { IBOVESPA_REFERENCIA, normalizarConfig, REGRA_IBOV, WATCHLIST_PADRAO } from './config';

const p = (id: string): Preco => ({ id, nome: id, valor: 1 });
const precos = new Map(['IBOV', 'TESOURO_PRE_2031', 'TESOURO_PRE_2027'].map((id) => [id, p(id)]));

describe('watchlist', () => {
  it('mantém a ordem e marca ausentes como "sem dado hoje"', () => {
    const r = montarWatchlist(
      [
        {
          nome: 'A',
          itens: [
            { id: 'SMLL', ativo: true },
            { id: 'IBOV', ativo: true },
            { id: 'IFIX', ativo: false },
          ],
        },
      ],
      precos,
    );
    expect(r[0]!.itens.map((i) => i.id)).toEqual(['IBOV']);
    expect(r[0]!.ausentes).toEqual(['SMLL']);
  });
  it('curinga traz todos os vencimentos', () => {
    const r = montarWatchlist(
      [
        {
          nome: 'RF',
          itens: [
            { id: 'TESOURO_PRE_*', ativo: true },
            { id: 'TESOURO_IPCA_*', ativo: true },
          ],
        },
      ],
      precos,
    );
    expect(r[0]!.itens.map((i) => i.id)).toEqual(['TESOURO_PRE_2031', 'TESOURO_PRE_2027']);
    expect(r[0]!.ausentes).toEqual(['TESOURO_IPCA_*']);
  });
  it('grupo com tudo desmarcado some', () => {
    expect(montarWatchlist([{ nome: 'X', itens: [{ id: 'IBOV', ativo: false }] }], precos)).toEqual([]);
  });
});

describe('carteira do Ibovespa', () => {
  it('a regra "grupo:" traz todos os ativos do grupo, sem marcar "sem dado"', () => {
    const m = new Map<string, Preco>(
      [
        { id: 'WEGE3', nome: 'WEG', valor: 1, grupo: 'acoes_ibov' },
        { id: 'TEND3', nome: 'Tenda', valor: 1, grupo: 'acoes_ibov' },
        { id: 'MXRF11', nome: 'Maxi', valor: 1, grupo: 'fiis' },
      ].map((p) => [p.id, p]),
    );
    const r = montarWatchlist(
      [
        {
          nome: 'Ibov',
          itens: [
            { id: 'grupo:acoes_ibov', ativo: true },
            { id: 'WEGE3', ativo: true },
            { id: 'XXXX3', ativo: true },
          ],
        },
      ],
      m,
    );
    expect(r[0]!.itens.map((i) => i.id)).toEqual(['WEGE3', 'TEND3']);
    expect(r[0]!.ausentes).toEqual(['XXXX3']);
  });

  it('lista padrão já vem com a carteira completa', () => {
    const g = WATCHLIST_PADRAO.find((x) => x.nome.startsWith('Ibovespa'))!;
    expect(g.itens[0]!.id).toBe(REGRA_IBOV);
    expect(g.itens.map((i) => i.id)).toEqual(expect.arrayContaining(['TEND3', 'PETR4', 'VALE3', 'ITUB4']));
    expect(g.itens.map((i) => i.id)).not.toContain('SLCE3');
    expect(new Set(IBOVESPA_REFERENCIA).size).toBe(IBOVESPA_REFERENCIA.length);
  });

  it('quem já usava o app ganha o grupo novo, sem perder o que editou', () => {
    const antiga = normalizarConfig({ watchlist: [{ nome: 'Minha', itens: [{ id: 'PETR4', ativo: true }] }] });
    expect(antiga.watchlist.map((g) => g.nome)).toEqual(['Minha', 'Ibovespa — carteira completa']);
    // Se a pessoa apagou o grupo depois da migração, ele não volta.
    const semGrupo = normalizarConfig({ watchlist: [{ nome: 'Minha', itens: [] }], versaoLista: 2 });
    expect(semGrupo.watchlist.map((g) => g.nome)).toEqual(['Minha']);
  });
});
