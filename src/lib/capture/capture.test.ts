import { describe, expect, it } from 'vitest';
import { DICIONARIO_INICIAL } from '../db/categories';
import type { CategoryRule, KeywordEntry } from '../db/schemas';
import { categorizar, detectarIgnoravel } from './categorizar';
import { parseFrase, parseTextoLivre } from './texto';

const dicionario: KeywordEntry[] = DICIONARIO_INICIAL.map((k, i) => ({ ...k, id: String(i) }));
const semRegras = new Map<string, CategoryRule>();

describe('categorizar', () => {
  it('usa o dicionário', () => {
    expect(categorizar('POSTO IPIRANGA CENTRO', { regras: semRegras, dicionario })).toMatchObject({
      categoria: 'Combustível',
      fonte: 'dicionario',
    });
    expect(categorizar('Drogaria São Paulo', { regras: semRegras, dicionario }).categoria).toBe('Farmácia');
    expect(categorizar('Pague Menos 123', { regras: semRegras, dicionario }).categoria).toBe('Farmácia');
    expect(categorizar('UBER *TRIP', { regras: semRegras, dicionario }).categoria).toBe('Transporte');
    expect(categorizar('99 POP', { regras: semRegras, dicionario }).categoria).toBe('Transporte');
    expect(categorizar('ATACADAO SA', { regras: semRegras, dicionario }).categoria).toBe('Mercado (além do VA)');
    expect(categorizar('IFOOD *PEDIDO', { regras: semRegras, dicionario }).categoria).toBe('Restaurante');
    expect(categorizar('Clínica Odontológica Sorriso', { regras: semRegras, dicionario })).toMatchObject({
      categoria: 'Saúde',
      dedutivel: 'saude',
    });
    expect(categorizar('Colégio Exemplo Ltda', { regras: semRegras, dicionario })).toMatchObject({
      categoria: 'Escola',
      dedutivel: 'educacao',
    });
    expect(categorizar('HOTEL CENTRAL', { regras: semRegras, dicionario })).toMatchObject({
      tipo: 'trabalho',
      categoria: 'Hospedagem',
    });
    expect(categorizar('NETFLIX.COM', { regras: semRegras, dicionario }).categoria).toBe('Assinaturas');
    expect(categorizar('Amazon Prime BR', { regras: semRegras, dicionario }).categoria).toBe('Assinaturas');
  });
  it('não confunde números ou pedaços de palavras', () => {
    expect(categorizar('LOJA 1990', { regras: semRegras, dicionario }).fonte).toBe('padrao');
    expect(categorizar('Marshell Ltda', { regras: semRegras, dicionario }).fonte).toBe('padrao');
  });
  it('regra aprendida tem prioridade', () => {
    const regras = new Map<string, CategoryRule>([
      ['posto ipiranga centro', { chave: 'posto ipiranga centro', tipo: 'trabalho', categoria: 'Combustível', atualizadoEm: '' }],
    ]);
    expect(categorizar('POSTO IPIRANGA CENTRO 001', { regras, dicionario })).toMatchObject({ tipo: 'trabalho', fonte: 'regra' });
  });
  it('sem correspondência → Outros', () => {
    expect(categorizar('Loja XYZ', { regras: semRegras, dicionario })).toMatchObject({
      tipo: 'saida',
      categoria: 'Outros',
      fonte: 'padrao',
    });
    expect(categorizar('show', { regras: semRegras, dicionario, tipoPadrao: 'entrada' })).toMatchObject({
      categoria: 'Outras entradas',
    });
  });
});

describe('detectarIgnoravel', () => {
  it.each([
    ['PAGAMENTO DE FATURA', 'fatura'],
    ['Pagto Fatura Cartão', 'fatura'],
    ['TRANSF ENTRE CONTAS', 'transferencia'],
    ['Pix mesma titularidade', 'transferencia'],
    ['ESTORNO COMPRA', 'estorno'],
    ['Mercado Bom Preço', null],
  ])('%s → %s', (t, r) => {
    expect(detectarIgnoravel(t)).toBe(r);
  });
});

describe('parseFrase', () => {
  const now = new Date(2026, 9, 7, 12);
  it('gastei 87 no posto hoje', () => {
    expect(parseFrase('gastei 87 no posto hoje', now)).toEqual({
      valor: 8700,
      data: '2026-10-07',
      tipo: 'saida',
      descricao: 'posto',
      forma: null,
    });
  });
  it('42,50 farmácia ontem', () => {
    expect(parseFrase('42,50 farmácia ontem', now)).toMatchObject({ valor: 4250, data: '2026-10-06', descricao: 'farmácia' });
  });
  it('recebi 400 do show', () => {
    expect(parseFrase('recebi 400 do show', now)).toMatchObject({ valor: 40000, tipo: 'entrada', descricao: 'show' });
  });
  it('anteontem, data dd/mm e forma', () => {
    expect(parseFrase('paguei R$ 1.250,00 na escola anteontem no pix', now)).toMatchObject({
      valor: 125000,
      data: '2026-10-05',
      descricao: 'escola',
      forma: 'Conta / Pix',
    });
    expect(parseFrase('uber 23,90 05/10', now)).toMatchObject({ valor: 2390, data: '2026-10-05', descricao: 'uber' });
    expect(parseFrase('mercado 120 reais dia 03/10 cartão', now)).toMatchObject({
      valor: 12000,
      data: '2026-10-03',
      descricao: 'mercado',
      forma: 'Cartão',
    });
  });
  it('sem valor → null', () => {
    expect(parseFrase('fui ao mercado', now)).toBeNull();
  });
  it('várias linhas', () => {
    expect(parseTextoLivre('gastei 10 no posto\n\n20 padaria; recebi 50 do show', now)).toHaveLength(3);
  });
});
