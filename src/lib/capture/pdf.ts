import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { agruparLinhas, type ItemTextoPDF } from './pdfLinhas';

async function abrir(dados: ArrayBuffer): Promise<{ doc: PDFDocumentProxy; task: PDFDocumentLoadingTask }> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const task = pdfjs.getDocument({ data: new Uint8Array(dados) });
  return { doc: await task.promise, task };
}

/** Extrai as linhas de texto de todas as páginas (agrupadas por y). */
export async function extrairLinhasPDF(dados: ArrayBuffer): Promise<{ linhas: string[]; temTexto: boolean; paginas: number }> {
  const { doc, task } = await abrir(dados.slice(0));
  const linhas: string[] = [];
  let chars = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const itens: ItemTextoPDF[] = [];
    for (const it of content.items) {
      if (!('str' in it)) continue;
      chars += it.str.trim().length;
      itens.push({ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number, w: it.width });
    }
    linhas.push(...agruparLinhas(itens));
  }
  const paginas = doc.numPages;
  await task.destroy();
  return { linhas, temTexto: chars >= 20, paginas };
}

/** Rasteriza as páginas (para OCR quando o PDF não tem texto). */
export async function rasterizarPDF(dados: ArrayBuffer, escala = 2, maxPaginas = 10): Promise<Blob[]> {
  const { doc, task } = await abrir(dados.slice(0));
  const out: Blob[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, maxPaginas); p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: escala });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    out.push(
      await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao gerar imagem'))), 'image/png'),
      ),
    );
  }
  await task.destroy();
  return out;
}
