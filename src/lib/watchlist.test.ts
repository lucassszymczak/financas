import { describe, expect, it } from 'vitest';
import type { Preco } from '../schema/radar';
import { montarWatchlist } from './watchlist';

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
