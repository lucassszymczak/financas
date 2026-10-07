import { describe, expect, it } from 'vitest';
import { analisarRecibo, cnpjValido, extrairCNPJ, extrairData, extrairResumoCategorias, extrairValor } from './recibo';

const ref = new Date(2026, 9, 7, 12);

// Amostras fictícias. CNPJ 11.222.333/0001-81 é um número de exemplo com DV válido.
const CUPOM = `POSTO EXEMPLO LTDA
Rua das Flores, 100 - Centro
CNPJ: 11.222.333/0001-81 IE: 123456
CUPOM FISCAL ELETRONICO - SAT
05/10/2026 14:32
GASOLINA COMUM 20,000 L x 5,99 119,80
QTD. TOTAL DE ITENS 1
SUBTOTAL 119,80
DESCONTO 2,80
VALOR TOTAL R$ 117,00
CARTAO DE CREDITO 117,00
TROCO 0,00`;

const PIX = `Comprovante de transferência
Pix enviado
R$ 250,00
05 OUT 2026 - 10:21
De
FULANO DA SILVA
Para
Clínica Bem Estar Ltda
CNPJ 11.222.333/0001-81
ID da transação E123`;

const RESUMO = `Resumo da fatura
Restaurantes ........ R$ 412,30
Supermercado R$ 1.020,45
Transporte 180,00
Saúde 95,50
Total R$ 1.708,25`;

describe('recibo', () => {
  it('valida CNPJ', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11.222.333/0001-82')).toBe(false);
    expect(cnpjValido('11111111111111')).toBe(false);
    expect(extrairCNPJ('cnpj 11 222 333/0001-80 e 11222333000181')).toBe('11.222.333/0001-81');
  });

  it('cupom fiscal', () => {
    const r = analisarRecibo(CUPOM, ref);
    expect(r).toMatchObject({
      valor: 11700,
      data: '2026-10-05',
      cnpj: '11.222.333/0001-81',
      estabelecimento: 'POSTO EXEMPLO LTDA',
      forma: 'Cartão',
      resumo: null,
    });
  });

  it('comprovante de Pix', () => {
    const r = analisarRecibo(PIX, ref);
    expect(r).toMatchObject({
      valor: 25000,
      data: '2026-10-05',
      estabelecimento: 'Clínica Bem Estar Ltda',
      forma: 'Conta / Pix',
    });
  });

  it('valor: palavra-chave na linha seguinte e maior valor como fallback', () => {
    expect(extrairValor('TOTAL A PAGAR\nR$ 45,90')).toBe(4590);
    expect(extrairValor('item 10,00\nitem 25,50\ntroco 50,00')).toBe(2550);
    expect(extrairValor('sem valores')).toBeNull();
    expect(extrairValor('Valor R$ 1.234,56')).toBe(123456);
  });

  it('datas', () => {
    expect(extrairData('emitido em 03/10/26', ref)).toBe('2026-10-03');
    expect(extrairData('compra 04/10 às 10h', ref)).toBe('2026-10-04');
    expect(extrairData('validade 10/12/2030 compra 01/10/2026', ref)).toBe('2026-10-01');
  });

  it('resumo por categoria', () => {
    expect(extrairResumoCategorias(RESUMO)).toEqual([
      { descricao: 'Restaurantes', valor: 41230 },
      { descricao: 'Supermercado', valor: 102045 },
      { descricao: 'Transporte', valor: 18000 },
      { descricao: 'Saúde', valor: 9550 },
    ]);
    expect(extrairResumoCategorias(CUPOM)).toBeNull();
  });
});
