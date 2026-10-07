import { parseMoney } from '../money';
import type { LinhaExtrato } from './extrato';

function campo(bloco: string, tag: string): string | null {
  const m = new RegExp(`<${tag}>\\s*([^<\\r\\n]*)`, 'i').exec(bloco);
  const v = m?.[1]?.trim();
  return v ? decodeEntities(v) : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** DTPOSTED: AAAAMMDD[HHMMSS[.XXX][[-3:BRT]]] */
function dataOFX(v: string | null): string | null {
  const m = v ? /^(\d{4})(\d{2})(\d{2})/.exec(v) : null;
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export type ResultadoOFX = { linhas: LinhaExtrato[]; cartao: boolean };

/** Lê OFX (SGML ou XML): blocos STMTTRN com DTPOSTED, TRNAMT e MEMO/NAME. */
export function parseOFX(texto: string): ResultadoOFX {
  const cartao = /<CCSTMTRS>/i.test(texto);
  const linhas: LinhaExtrato[] = [];
  const partes = texto.split(/<STMTTRN>/i).slice(1);
  for (const parte of partes) {
    const bloco = parte.split(/<\/STMTTRN>|<\/BANKTRANLIST>/i)[0] ?? parte;
    const data = dataOFX(campo(bloco, 'DTPOSTED'));
    const valorTxt = campo(bloco, 'TRNAMT');
    const valor = valorTxt ? parseMoney(valorTxt) : null;
    if (!data || valor === null || valor === 0) continue;
    const memo = campo(bloco, 'MEMO');
    const nome = campo(bloco, 'NAME');
    const descricao = memo && nome && !memo.includes(nome) && !nome.includes(memo) ? `${nome} ${memo}` : (memo ?? nome ?? '');
    linhas.push({ data, valor, descricao: descricao.replace(/\s+/g, ' ').trim() });
  }
  return { linhas, cartao };
}

export function pareceOFX(texto: string): boolean {
  return /<OFX>/i.test(texto) || /OFXHEADER/i.test(texto) || /<STMTTRN>/i.test(texto);
}
