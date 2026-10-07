/** Pré-processamento e compressão de imagens no navegador (canvas). */

async function carregar(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      /* cai para <img> */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(c: HTMLCanvasElement, tipo: string, q?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao gerar imagem'))), tipo, q));
}

function desenhar(img: ImageBitmap | HTMLImageElement, alvo: number, permitirAumentar: boolean): HTMLCanvasElement {
  const w = img.width;
  const h = img.height;
  const maior = Math.max(w, h);
  const escala = maior > alvo || permitirAumentar ? alvo / maior : 1;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * escala));
  c.height = Math.max(1, Math.round(h * escala));
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Para o OCR: 1800 px no lado maior, escala de cinza e contraste esticado (percentis 2% e 98%). */
export async function preprocessarParaOCR(blob: Blob): Promise<HTMLCanvasElement> {
  const img = await carregar(blob);
  const c = desenhar(img, 1800, true);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const g = Math.round(0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!);
    px[i] = g;
    hist[g]!++;
  }
  const total = px.length / 4;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v]!;
    if (acc >= total * 0.02) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v]!;
    if (acc >= total * 0.02) {
      hi = v;
      break;
    }
  }
  // Imagens quase todas brancas (prints) têm percentis colados: aí só converte para cinza.
  const esticar = hi - lo >= 48;
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < px.length; i += 4) {
    const v = esticar ? Math.min(255, Math.max(0, ((px[i]! - lo) * 255) / range)) : px[i]!;
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/** Comprovante guardado: JPEG colorido, 1600 px no lado maior, qualidade 0,8. */
export async function comprimirComprovante(blob: Blob): Promise<Blob> {
  const img = await carregar(blob);
  const c = desenhar(img, 1600, false);
  return canvasBlob(c, 'image/jpeg', 0.8);
}
