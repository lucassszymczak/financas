import { describe, expect, it } from 'vitest';
import { aplicarMapeamento, detectarMapeamento, detectarSeparador, parseCSV } from './csv';
import { decodificarTexto } from './extrato';
import { parseOFX } from './ofx';
import { agruparLinhas, parseLinhasExtrato } from './pdfLinhas';

const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261005120000[-3:BRT]
<TRNAMT>-87.00
<FITID>1
<MEMO>POSTO EXEMPLO
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261006
<TRNAMT>1500,50
<NAME>PIX RECEBIDO
<MEMO>FULANO DE TAL
</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

const OFX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="220"?>
<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261001</DTPOSTED><TRNAMT>-42.50</TRNAMT><NAME>FARMACIA &amp; CIA</NAME></STMTTRN>
<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20261002</DTPOSTED><TRNAMT>10.00</TRNAMT><MEMO>ESTORNO</MEMO></STMTTRN>
</BANKTRANLIST></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`;

describe('OFX', () => {
  it('SGML', () => {
    const r = parseOFX(OFX_SGML);
    expect(r.cartao).toBe(false);
    expect(r.linhas).toEqual([
      { data: '2026-10-05', valor: -8700, descricao: 'POSTO EXEMPLO' },
      { data: '2026-10-06', valor: 150050, descricao: 'PIX RECEBIDO FULANO DE TAL' },
    ]);
  });
  it('XML de cartão', () => {
    const r = parseOFX(OFX_XML);
    expect(r.cartao).toBe(true);
    expect(r.linhas).toEqual([
      { data: '2026-10-01', valor: -4250, descricao: 'FARMACIA & CIA' },
      { data: '2026-10-02', valor: 1000, descricao: 'ESTORNO' },
    ]);
  });
  it('decodifica Windows-1252', () => {
    const bytes = new Uint8Array([0x46, 0x41, 0x52, 0x4d, 0xc1, 0x43, 0x49, 0x41]); // FARMÁCIA em latin1
    expect(decodificarTexto(bytes)).toBe('FARMÁCIA');
  });
});

describe('CSV', () => {
  it('extrato brasileiro com ; e cabeçalho', () => {
    const txt =
      '\uFEFFData;Histórico;Valor;Saldo\n05/10/2026;"PIX ENVIADO; FULANO";-1.234,56;100,00\n06/10/2026;SALARIO;5.000,00;5.100,00\n';
    const sep = detectarSeparador(txt);
    expect(sep).toBe(';');
    const rows = parseCSV(txt, sep);
    expect(rows[1]![1]).toBe('PIX ENVIADO; FULANO');
    const m = detectarMapeamento(rows, sep)!;
    expect(m).toMatchObject({
      temCabecalho: true,
      colData: 0,
      colDescricao: 1,
      colValor: 2,
      formatoValor: 'br',
      positivoEhSaida: false,
    });
    expect(aplicarMapeamento(rows, m)).toEqual([
      { data: '2026-10-05', valor: -123456, descricao: 'PIX ENVIADO; FULANO' },
      { data: '2026-10-06', valor: 500000, descricao: 'SALARIO' },
    ]);
  });
  it('fatura de cartão com , datas ISO e valores positivos', () => {
    const txt = 'date,title,amount\n2026-10-01,Uber *Trip,23.90\n2026-10-02,Padaria,1234.50\n2026-10-03,Mercado,10.00\n';
    const sep = detectarSeparador(txt);
    expect(sep).toBe(',');
    const rows = parseCSV(txt, sep);
    const m = detectarMapeamento(rows, sep)!;
    expect(m).toMatchObject({ formatoData: 'aaaa-mm-dd', formatoValor: 'us', positivoEhSaida: true, colDescricao: 1 });
    expect(aplicarMapeamento(rows, m)[1]).toEqual({ data: '2026-10-02', valor: -123450, descricao: 'Padaria' });
  });
  it('sem cabeçalho detecta pelas colunas', () => {
    const txt = '01/10/2026;Loja A;-10,00\n02/10/2026;Loja B;-20,00\n';
    const rows = parseCSV(txt, ';');
    const m = detectarMapeamento(rows, ';')!;
    expect(m).toMatchObject({ temCabecalho: false, colData: 0, colDescricao: 1, colValor: 2 });
  });
  it('falha quando não há colunas reconhecíveis', () => {
    expect(detectarMapeamento(parseCSV('a;b\nc;d\n', ';'), ';')).toBeNull();
  });
});

describe('PDF (linhas)', () => {
  it('agrupa itens por y', () => {
    const linhas = agruparLinhas([
      { str: '23,90', x: 400, y: 700, w: 30 },
      { str: '05/10', x: 50, y: 700.5, w: 30 },
      { str: 'UBER', x: 100, y: 701, w: 30 },
      { str: 'Outra linha', x: 50, y: 680, w: 60 },
    ]);
    expect(linhas).toEqual(['05/10 UBER 23,90', 'Outra linha']);
  });
  it('aplica a regex de lançamento', () => {
    const ref = new Date(2026, 9, 20);
    const r = parseLinhasExtrato(
      [
        'Data Descrição Valor',
        '05/10 UBER *TRIP 23,90',
        '06/10/2026 PIX ENVIADO FULANO -50,00 1.234,56',
        '07/10/2026 TED RECEBIDA 1.000,00 C',
        '08/10/2026 TARIFA PACOTE 30,00 D',
        '09 OUT MERCADO BOM R$ 120,00',
        '10/10/2026 PIX RECEBIDO CICLANO 200,00',
        'SALDO ANTERIOR 1.000,00',
        'texto qualquer',
      ],
      ref,
    );
    expect(r).toEqual([
      { data: '2026-10-05', valor: -2390, descricao: 'UBER *TRIP' },
      { data: '2026-10-06', valor: -5000, descricao: 'PIX ENVIADO FULANO' },
      { data: '2026-10-07', valor: 100000, descricao: 'TED RECEBIDA' },
      { data: '2026-10-08', valor: -3000, descricao: 'TARIFA PACOTE' },
      { data: '2026-10-09', valor: -12000, descricao: 'MERCADO BOM' },
      { data: '2026-10-10', valor: 20000, descricao: 'PIX RECEBIDO CICLANO' },
    ]);
  });
});
