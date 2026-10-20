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
  it('commodities e agro viram emoji', () => {
    expect(iconeAtivo({ id: 'BRENT', grupo: 'commodities', nome: 'Petróleo Brent' }, {})).toEqual({ tipo: 'emoji', emoji: '🛢️' });
    expect(iconeAtivo({ id: 'SOJA_CBOT', nome: 'Soja Chicago', regiao: 'chicago' }, {})).toEqual({
      tipo: 'desenho',
      desenho: 'grao-soja',
    });
    expect(iconeAtivo({ id: 'OURO', grupo: 'commodities', nome: 'Ouro' }, {})).toEqual({
      tipo: 'desenho',
      desenho: 'barra-ouro',
    });
    expect(iconeAtivo({ id: 'ACUCAR_CEPEA', nome: 'Açúcar cristal SP (Cepea)', regiao: 'noroeste_paulista' }, {})).toEqual({
      tipo: 'desenho',
      desenho: 'saca-acucar',
    });
    expect(iconeAtivo({ id: 'GPV_FEIJAO', nome: 'Feijão preto', regiao: 'guarapuava' }, {})).toEqual({
      tipo: 'emoji',
      emoji: '🫘',
    });
    expect(iconeAtivo({ id: 'BOI_CEPEA', nome: 'Boi gordo SP', regiao: 'brasil' }, {})).toEqual({ tipo: 'emoji', emoji: '🐂' });
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
