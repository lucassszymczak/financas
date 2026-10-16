/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ajustarContraste, contraste } from './cor';

/** Lê as variáveis de cada tema direto de tokens.css. */
function tokens(): Record<'light' | 'dark', Record<string, string>> {
  const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
  const bloco = (seletor: RegExp) => {
    const corpo = css.match(seletor)?.[1] ?? '';
    return Object.fromEntries([...corpo.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]));
  };
  return { light: bloco(/:root\[data-theme='light'\]\s*\{([^}]*)\}/), dark: bloco(/:root\[data-theme='dark'\]\s*\{([^}]*)\}/) };
}

// [texto, fundo] que aparecem juntos na interface.
const PARES: [string, string][] = [
  ['texto', 'fundo'],
  ['texto', 'superficie'],
  ['texto', 'superficie-2'],
  ['texto-mudo', 'fundo'],
  ['texto-mudo', 'superficie'],
  ['texto-mudo', 'superficie-2'],
  ['alta', 'superficie'],
  ['baixa', 'superficie'],
  ['alta', 'superficie-2'],
  ['baixa', 'superficie-2'],
  ['alta', 'positivo-fundo'],
  ['baixa', 'negativo-fundo'],
  ['aviso-texto', 'aviso-fundo'],
  ['info-texto', 'info-fundo'],
  ['perigo-texto', 'perigo-fundo'],
  ['misto-texto', 'misto-fundo'],
  ['laranja-texto', 'superficie'],
  ['destaque-texto', 'destaque'],
];

describe('contraste WCAG AA (4,5:1) nos dois temas', () => {
  const t = tokens();
  for (const tema of ['light', 'dark'] as const) {
    it.each(PARES)(`${tema}: %s sobre %s`, (a, b) => {
      const ca = t[tema][a];
      const cb = t[tema][b];
      expect(ca && cb, `${a}/${b} definidos`).toBeTruthy();
      expect(contraste(ca!, cb!)).toBeGreaterThanOrEqual(4.5);
    });
  }
  it('selo laranja usa texto escuro', () => expect(contraste('#1a0d00', '#f58220')).toBeGreaterThanOrEqual(4.5));
});

describe('ajuste da cor de destaque', () => {
  it('verde #005C46 é clareado no tema escuro até passar de 4,5:1', () => {
    const c = ajustarContraste('#005c46', '#131a18');
    expect(c).not.toBe('#005c46');
    expect(contraste(c, '#131a18')).toBeGreaterThanOrEqual(4.5);
  });
  it('verde #005C46 já passa no tema claro', () => {
    expect(ajustarContraste('#005c46', '#ffffff')).toBe('#005c46');
  });
  it('cor clara escolhida pelo usuário é escurecida no tema claro', () => {
    expect(contraste(ajustarContraste('#ffe066', '#f4f6f5'), '#f4f6f5')).toBeGreaterThanOrEqual(4.5);
  });
});
