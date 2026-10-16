/** Utilidades de cor para garantir contraste WCAG AA com a cor de destaque escolhida pelo usuário. */

type RGB = [number, number, number];

export function hexParaRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

export function rgbParaHex([r, g, b]: RGB): string {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(Math.min(255, Math.max(0, v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

function luminancia(hex: string): number {
  const [r, g, b] = hexParaRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

export function misturar(a: string, b: string, t: number): string {
  const ca = hexParaRgb(a);
  const cb = hexParaRgb(b);
  return rgbParaHex(ca.map((v, i) => v + (cb[i]! - v) * t) as RGB);
}

/**
 * Clareia (fundo escuro) ou escurece (fundo claro) a cor até atingir o contraste mínimo.
 * Ex.: o verde #005C46 sobre fundo quase preto vira um verde mais claro e legível.
 */
export function ajustarContraste(cor: string, fundo: string, minimo = 4.5): string {
  if (contraste(cor, fundo) >= minimo) return cor;
  const alvo = luminancia(fundo) < 0.5 ? '#ffffff' : '#000000';
  for (let t = 0.05; t <= 1; t += 0.05) {
    const c = misturar(cor, alvo, t);
    if (contraste(c, fundo) >= minimo) return c;
  }
  return alvo;
}

/** Texto legível sobre um fundo colorido (botão primário). */
export const textoSobre = (fundo: string) => (contraste('#ffffff', fundo) >= contraste('#000000', fundo) ? '#ffffff' : '#000000');
