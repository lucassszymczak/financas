import { ErroSync } from './sync';

/**
 * Código para conectar outro aparelho à sincronização sem pedir a chave do GitHub de novo.
 * O aparelho já conectado gera um código com a chave e o Gist, cifrados (AES-GCM) com uma
 * senha de 6 dígitos que aparece só na tela (PBKDF2, 250 mil rodadas). O código pode ir por
 * mensagem para você mesmo; sem a senha ele não abre. Vale por 24 horas.
 */

export const PREFIXO = 'RADAR1.';
const RODADAS = 250_000;
export const VALIDADE_MS = 24 * 60 * 60 * 1000;

export type DadosPareamento = { token: string; gistId: string };
type Conteudo = { v: 1; t: string; g: string; em: number };

const cripto = () => globalThis.crypto;

function paraBase64Url(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function chave(senha: string, sal: Uint8Array): Promise<CryptoKey> {
  const base = await cripto().subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
  return cripto().subtle.deriveKey(
    { name: 'PBKDF2', salt: sal as BufferSource, iterations: RODADAS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Senha de 6 dígitos, sorteada com o gerador criptográfico do navegador. */
export function gerarSenha(): string {
  const n = cripto().getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  return String(n).padStart(6, '0');
}

export async function criarCodigo(dados: DadosPareamento, senha: string, agora = Date.now()): Promise<string> {
  const sal = cripto().getRandomValues(new Uint8Array(16));
  const iv = cripto().getRandomValues(new Uint8Array(12));
  const conteudo: Conteudo = { v: 1, t: dados.token, g: dados.gistId, em: agora };
  const cifrado = new Uint8Array(
    await cripto().subtle.encrypt(
      { name: 'AES-GCM', iv },
      await chave(senha, sal),
      new TextEncoder().encode(JSON.stringify(conteudo)),
    ),
  );
  const tudo = new Uint8Array(sal.length + iv.length + cifrado.length);
  tudo.set(sal, 0);
  tudo.set(iv, sal.length);
  tudo.set(cifrado, sal.length + iv.length);
  return PREFIXO + paraBase64Url(tudo);
}

/** Aceita o código puro ou o link de pareamento inteiro (…#/config/parear/RADAR1.…). */
export function extrairCodigo(texto: string): string | null {
  const m = texto.replace(/\s+/g, '').match(/RADAR1\.[A-Za-z0-9_-]+/);
  return m ? m[0] : null;
}

export async function abrirCodigo(texto: string, senha: string, agora = Date.now()): Promise<DadosPareamento> {
  const codigo = extrairCodigo(texto);
  if (!codigo) throw new ErroSync('Isso não parece um código do Radar. Ele começa com RADAR1.');
  if (!/^\d{6}$/.test(senha.trim())) throw new ErroSync('A senha tem 6 números.');
  let bytes: Uint8Array;
  try {
    bytes = deBase64Url(codigo.slice(PREFIXO.length));
  } catch {
    throw new ErroSync('O código veio incompleto. Copie de novo, inteiro.');
  }
  if (bytes.length < 16 + 12 + 17) throw new ErroSync('O código veio incompleto. Copie de novo, inteiro.');
  let c: Conteudo;
  try {
    const claro = await cripto().subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(16, 28) },
      await chave(senha.trim(), bytes.slice(0, 16)),
      bytes.slice(28),
    );
    c = JSON.parse(new TextDecoder().decode(claro)) as Conteudo;
  } catch {
    throw new ErroSync('Senha errada ou código incompleto. Confira os 6 números mostrados no outro aparelho.');
  }
  if (c.v !== 1 || !c.t || !c.g) throw new ErroSync('Código de uma versão desconhecida do app.');
  if (agora - c.em > VALIDADE_MS) throw new ErroSync('Este código expirou (vale 24 horas). Gere outro no aparelho conectado.');
  return { token: c.t, gistId: c.g };
}

/** Link que abre o app já com o código preenchido em Configurações. */
export function linkPareamento(codigo: string, base = `${location.origin}${location.pathname}`): string {
  return `${base}#/config/parear/${codigo}`;
}
