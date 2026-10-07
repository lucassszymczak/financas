import type { Worker } from 'tesseract.js';

export type ProgressoOCR = { etapa: 'carregando' | 'lendo'; pct: number };

let workerPromise: Promise<Worker> | null = null;
let ouvinte: ((p: ProgressoOCR) => void) | null = null;
let carregado = false;

function url(caminho: string): string {
  return new URL(caminho, document.baseURI).href;
}

/** Já carregou o leitor nesta sessão? */
export function ocrCarregado(): boolean {
  return carregado;
}

/** Cria (uma vez) o worker do Tesseract com arquivos servidos pelo próprio site. */
function obterWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, OEM } = await import('tesseract.js');
      const w = await createWorker('por', OEM.LSTM_ONLY, {
        workerPath: url('./ocr/worker.min.js'),
        corePath: url('./ocr/core/'),
        langPath: url('./ocr/lang'),
        gzip: true,
        cacheMethod: 'none',
        workerBlobURL: false,
        logger: (m) => {
          if (!ouvinte) return;
          const lendo = m.status === 'recognizing text';
          ouvinte({ etapa: lendo ? 'lendo' : 'carregando', pct: typeof m.progress === 'number' ? m.progress : 0 });
        },
      });
      await w.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '300' });
      carregado = true;
      return w;
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

/** Reconhece o texto de uma imagem (canvas já pré-processado). */
export async function reconhecer(imagem: HTMLCanvasElement | Blob, onProgresso?: (p: ProgressoOCR) => void): Promise<string> {
  ouvinte = onProgresso ?? null;
  try {
    const w = await obterWorker();
    // O Tesseract recebe um PNG: mais previsível do que passar o canvas entre navegadores.
    const entrada =
      imagem instanceof Blob
        ? imagem
        : await new Promise<Blob>((res, rej) =>
            imagem.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao preparar imagem'))), 'image/png'),
          );
    const r = await w.recognize(entrada);
    return r.data.text;
  } finally {
    ouvinte = null;
  }
}
