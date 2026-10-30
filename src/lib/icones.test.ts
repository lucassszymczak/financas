import { describe, expect, it } from 'vitest';
import { avatar, CORES_AVATAR, iconeAtivo, raizTicker } from './icones';
import { contraste } from './cor';

const LOGOS = { PETR: 'PETR.svg', VALE: 'VALE.png' };

describe('ícone do ativo', () => {
  it('PETR3 e PETR4 usam o mesmo logo', () => {
    const a = iconeAtivo({ id: 'PETR3', grupo: 'acoes_bluechips' }, LOGOS);
    const b = iconeAtivo({ id: 'PETR4', grupo: 'acoes_ibov' }, LOGOS);
    expect(a).toEqual({ tipo: 'logo', src: './logos/PETR.svg', raiz: 'PETR' });
    expect(b).toEqual(a);
    expect(raizTicker('ITUB4')).toBe('ITUB');
  });
  it('SPX e USDBRL → bandeira dos EUA; DI1F29 → Brasil', () => {
    expect(iconeAtivo({ id: 'SPX', grupo: 'indices_mundo' }, {})).toMatchObject({ tipo: 'bandeira', pais: 'us' });
    expect(iconeAtivo({ id: 'USDBRL', grupo: 'moedas' }, {})).toMatchObject({ tipo: 'bandeira', pais: 'us' });
    expect(iconeAtivo({ id: 'EURBRL', grupo: 'moedas' }, {})).toMatchObject({ tipo: 'bandeira', pais: 'eu' });
    expect(iconeAtivo({ id: 'DI1F29', grupo: 'juros_br' }, {})).toMatchObject({ tipo: 'bandeira', pais: 'br' });
    expect(iconeAtivo({ id: 'DI1F29' }, {})).toMatchObject({ tipo: 'bandeira', pais: 'br' });
    expect(iconeAtivo({ id: 'N225', grupo: 'indices_mundo' }, {})).toMatchObject({ pais: 'jp' });
  });
  it('commodities e agro: ícone do produto, com bandeirinha da praça quando houver', () => {
    expect(iconeAtivo({ id: 'BRENT', grupo: 'commodities', nome: 'Petróleo Brent' }, {})).toEqual({ tipo: 'emoji', emoji: '🛢️' });
    expect(iconeAtivo({ id: 'OURO', grupo: 'commodities', nome: 'Ouro' }, {})).toEqual({
      tipo: 'desenho',
      desenho: 'barra-ouro',
    });
    expect(iconeAtivo({ id: 'SOJA_CBOT', nome: 'Soja Chicago', regiao: 'chicago' }, {})).toMatchObject({
      tipo: 'desenho',
      desenho: 'grao-soja',
      selo: { pais: 'us' },
    });
    expect(iconeAtivo({ id: 'ACUCAR_CEPEA', nome: 'Açúcar cristal SP (Cepea)', regiao: 'noroeste_paulista' }, {})).toMatchObject({
      desenho: 'cubos-acucar',
      selo: { pais: 'br' },
    });
    expect(iconeAtivo({ id: 'GPV_FEIJAO', nome: 'Feijão preto', regiao: 'guarapuava' }, {})).toMatchObject({
      emoji: '🫘',
      selo: { pais: 'br' },
    });
    expect(iconeAtivo({ id: 'BOI_CEPEA', nome: 'Boi gordo SP', regiao: 'brasil' }, {})).toMatchObject({
      emoji: '🐂',
      selo: { pais: 'br', nomePais: 'Brasil' },
    });
  });
  it('país pelo nome quando o código não é conhecido', () => {
    const p = (id: string, nome: string, grupo = 'indices_mundo') =>
      (iconeAtivo({ id, nome, grupo }, {}) as { pais?: string }).pais;
    expect(p('NIKKEI', 'Nikkei 225')).toBe('jp');
    expect(p('FTSE100', 'FTSE 100')).toBe('gb');
    expect(p('FTSEMIB', 'FTSE MIB')).toBe('it');
    expect(p('STOXX50', 'Euro Stoxx 50')).toBe('eu');
    expect(p('SHCOMP', 'Shanghai Composite')).toBe('cn');
    expect(p('HANGSENG', 'Hang Seng')).toBe('hk');
    expect(p('ASX200', 'S&P/ASX 200')).toBe('au');
    expect(p('GSPTSE', 'S&P/TSX')).toBe('ca');
    expect(p('IBEX35', 'IBEX 35')).toBe('es');
    expect(p('NIFTY50', 'Nifty 50')).toBe('in');
    expect(p('SPX500', 'S&P 500')).toBe('us');
    expect(p('GILT10', 'Gilt 10 anos', 'juros_mundo')).toBe('gb');
    expect(p('JGB10', 'JGB 10 anos', 'juros_mundo')).toBe('jp');
    expect(p('T10Y', 'Treasury 10 anos', 'juros_mundo')).toBe('us');
    expect(p('USDCLP', 'Dólar/Peso chileno', 'moedas_mundo')).toBe('cl');
    expect(p('EUR/BRL', 'Euro', 'moedas')).toBe('eu');
    expect(p('GBPBRL=X', 'Libra', 'moedas')).toBe('gb');
    expect(p('MOEDA_X', 'Peso mexicano', 'moedas_mundo')).toBe('mx');
    expect(p('AUD', 'Dólar australiano', 'moedas_mundo')).toBe('au');
  });
  it('dólar turismo e Ptax: cédula; dólar comercial: bandeira dos EUA', () => {
    expect(iconeAtivo({ id: 'USDBRL_TUR', grupo: 'moedas', nome: 'Dólar turismo' }, {})).toEqual({
      tipo: 'desenho',
      desenho: 'cedula-dolar',
    });
    expect(iconeAtivo({ id: 'PTAX', grupo: 'moedas', nome: 'Dólar Ptax' }, {})).toEqual({
      tipo: 'desenho',
      desenho: 'cedula-dolar',
    });
    expect(iconeAtivo({ id: 'USDBRL_PTAX', grupo: 'moedas', nome: 'Ptax venda' }, {})).toEqual({
      tipo: 'desenho',
      desenho: 'cedula-dolar',
    });
    expect(iconeAtivo({ id: 'PTAX', grupo: 'moedas', nome: 'Ptax' }, {})).toEqual({ tipo: 'desenho', desenho: 'cedula-dolar' });
    expect(iconeAtivo({ id: 'USDBRL', grupo: 'moedas', nome: 'Dólar comercial' }, {})).toMatchObject({ pais: 'us' });
  });
  it('sem imagem: avatar de iniciais, sempre com a mesma cor', () => {
    const a = iconeAtivo({ id: 'WEGE3', grupo: 'acoes_ibov' }, LOGOS);
    expect(a).toMatchObject({ tipo: 'iniciais', texto: 'WE' });
    expect(iconeAtivo({ id: 'WEGE3', grupo: 'acoes_ibov' }, LOGOS)).toEqual(a);
    expect(avatar('XYZW11').cor).toBe(avatar('XYZW11').cor);
    expect(iconeAtivo({ id: 'ALGO_ESTRANHO' }, {})).toMatchObject({ tipo: 'iniciais', texto: 'AL' });
  });
  it('cores do avatar têm contraste AA com o texto branco', () => {
    for (const c of CORES_AVATAR) expect(contraste(c, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});
