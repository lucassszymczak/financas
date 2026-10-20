import { BANDEIRAS, NOMES_PAISES } from '../data/bandeiras';
import { GRUPOS_BRASIL, IDS_BRASIL, PAIS_POR_ID, PAIS_POR_MOEDA } from '../data/paises';
import { normalizar } from './busca';

/**
 * Qual ícone mostrar ao lado de um ativo. Tudo é local (logos em `public/logos/`, bandeiras
 * empacotadas): nada é buscado na internet. Quando não há imagem, vira um avatar com iniciais.
 */

export type AtivoBase = { id: string; grupo?: string | null; nome?: string | null; regiao?: string | null };

export type Icone =
  | { tipo: 'logo'; src: string; raiz: string }
  | { tipo: 'bandeira'; src: string; pais: string; nomePais: string }
  | { tipo: 'emoji'; emoji: string }
  | { tipo: 'iniciais'; texto: string; cor: string };

const GRUPOS_TICKER = /^(acoes|fiis?$|etfs?$|bdrs?$)/;
const TICKER_B3 = /^[A-Z]{4}\d{1,2}$/;

/** Raiz do código na B3: as 4 primeiras letras (PETR3 e PETR4 → PETR). */
export const raizTicker = (id: string) => id.slice(0, 4).toUpperCase();

export const ehTicker = (a: AtivoBase) => GRUPOS_TICKER.test(a.grupo ?? '') || TICKER_B3.test(a.id);

/**
 * Cores do avatar de iniciais: todas com contraste AA (≥ 4,5:1) com texto branco,
 * e o avatar tem fundo próprio, então vale nos dois temas.
 */
export const CORES_AVATAR = ['#14213D', '#5B3A8E', '#1F5F7A', '#7A3B2E', '#2E5E3A', '#7D5A12', '#8E2F55', '#3B4B6B'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function avatar(id: string): { texto: string; cor: string } {
  const letras = id.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return { texto: letras.slice(0, 2) || '?', cor: CORES_AVATAR[hash(id) % CORES_AVATAR.length]! };
}

/** País pelo par de moedas: contra o real, a moeda estrangeira; com o dólar na frente, a outra. */
function paisDoPar(id: string): string | null {
  const m = /^([A-Z]{3})_?([A-Z]{3})$/.exec(id);
  if (!m) return null;
  const [, a, b] = m as unknown as [string, string, string];
  if (b === 'BRL') return PAIS_POR_MOEDA[a] ?? null;
  if (a === 'USD') return PAIS_POR_MOEDA[b] ?? null;
  return PAIS_POR_MOEDA[a] ?? null;
}

const EMOJIS: [RegExp, string][] = [
  [/petroleo|brent|\bwti\b|oleo/, '🛢️'],
  [/gasolina|diesel|etanol|combustiv/, '⛽'],
  [/\bouro\b|gold/, '🥇'],
  [/minerio|ferro|cobre|niquel|aluminio|prata|zinco|litio|metal/, '⛏️'],
  [/soja|feijao/, '🫘'],
  [/milho/, '🌽'],
  [/trigo/, '🌾'],
  [/\bboi\b|bezerro|arroba|vaca|gado/, '🐂'],
  [/cafe/, '☕'],
  [/acucar/, '🍬'],
];

function emojiDe(a: AtivoBase): string | null {
  const t = normalizar(`${a.id.replace(/_/g, ' ')} ${a.nome ?? ''}`);
  for (const [re, e] of EMOJIS) if (re.test(t)) return e;
  return null;
}

const bandeira = (pais: string): Icone | null => {
  const src = BANDEIRAS[pais];
  return src ? { tipo: 'bandeira', src, pais, nomePais: NOMES_PAISES[pais] ?? pais.toUpperCase() } : null;
};

/**
 * Ícone de um ativo. `logos` é a lista de arquivos em `public/logos/` (RAIZ → arquivo);
 * `base` é o caminho do site (o app roda em subpasta no GitHub Pages).
 */
export function iconeAtivo(a: AtivoBase, logos: Record<string, string>, base = './'): Icone {
  const id = a.id.toUpperCase();
  if (ehTicker(a)) {
    const arquivo = logos[raizTicker(id)];
    if (arquivo) return { tipo: 'logo', src: `${base}logos/${arquivo}`, raiz: raizTicker(id) };
    return { tipo: 'iniciais', ...avatar(id) };
  }
  const pais =
    PAIS_POR_ID[id] ??
    ((a.grupo ?? '').startsWith('moedas') || /^[A-Z]{3}_?[A-Z]{3}$/.test(id) ? paisDoPar(id) : null) ??
    (GRUPOS_BRASIL.has(a.grupo ?? '') || IDS_BRASIL.has(id) || /^DI1[FGHJKMNQUVXZ]\d{2}$/.test(id) || id.startsWith('TESOURO_')
      ? 'br'
      : null);
  const b = pais ? bandeira(pais) : null;
  if (b) return b;
  const e = emojiDe(a);
  if (e) return { tipo: 'emoji', emoji: e };
  if (a.regiao) {
    const r = bandeira(normalizar(a.regiao) === 'chicago' ? 'us' : 'br');
    if (r) return r;
  }
  return { tipo: 'iniciais', ...avatar(id) };
}
