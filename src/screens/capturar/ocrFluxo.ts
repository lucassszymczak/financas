import { criarCandidato, type Candidato } from '../../lib/capture/candidato';
import { carregarContexto } from '../../lib/capture/fila';
import { comprimirComprovante, preprocessarParaOCR } from '../../lib/capture/imagem';
import { ocrCarregado, reconhecer } from '../../lib/capture/ocr';
import { analisarRecibo } from '../../lib/capture/recibo';
import { categoriaDoResumo } from '../../lib/capture/resumo';
import { todayISO } from '../../lib/dates';
import { db } from '../../lib/db/db';
import type { Origem } from '../../lib/db/schemas';
import type { Progresso } from './useProcessarArquivos';

const AVISO_PRIMEIRO = 'Primeiro uso: o leitor (cerca de 6 MB) é baixado uma vez e depois fica guardado.';

function progressoOCR(setP: (p: Progresso | null) => void, rotulo: string) {
  return (p: { etapa: 'carregando' | 'lendo'; pct: number }) =>
    setP(
      p.etapa === 'carregando'
        ? { texto: 'Carregando o leitor de texto…', pct: p.pct, aviso: AVISO_PRIMEIRO }
        : { texto: rotulo, pct: p.pct },
    );
}

/** OCR de várias imagens (páginas de PDF sem texto). */
export async function ocrDeImagens(imgs: Blob[], setP: (p: Progresso | null) => void): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < imgs.length; i++) {
    const canvas = await preprocessarParaOCR(imgs[i]!);
    out.push(await reconhecer(canvas, progressoOCR(setP, `Lendo página ${i + 1} de ${imgs.length}…`)));
  }
  return out;
}

/** Fotos e prints: pré-processa, roda o OCR e extrai valor, data, CNPJ, estabelecimento e forma. */
export async function processarImagens(files: File[], origem: Origem, setP: (p: Progresso | null) => void): Promise<Candidato[]> {
  const ctx = await carregarContexto(db);
  const out: Candidato[] = [];
  if (!ocrCarregado()) setP({ texto: 'Carregando o leitor de texto…', pct: 0, aviso: AVISO_PRIMEIRO });
  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    const rotulo = files.length > 1 ? `Lendo imagem ${i + 1} de ${files.length}…` : 'Lendo a imagem…';
    setP({ texto: rotulo, pct: null, aviso: ocrCarregado() ? undefined : AVISO_PRIMEIRO });
    const [canvas, jpeg] = await Promise.all([preprocessarParaOCR(f), comprimirComprovante(f)]);
    const texto = await reconhecer(canvas, progressoOCR(setP, rotulo));
    const a = analisarRecibo(texto);
    const data = a.data ?? todayISO();

    if (a.resumo) {
      a.resumo.forEach((item, k) => {
        const c = criarCandidato(
          {
            valor: item.valor,
            data,
            descricao: item.descricao,
            origem,
            forma: 'Cartão',
            imagem: k === 0 ? jpeg : null,
            textoReconhecido: k === 0 ? texto : null,
          },
          ctx,
        );
        const cat = c.fonteCategoria === 'padrao' ? categoriaDoResumo(item.descricao) : null;
        out.push(cat ? { ...c, categoria: cat, sugestao: { tipo: c.tipo, categoria: cat }, fonteCategoria: 'dicionario' } : c);
      });
      continue;
    }

    out.push(
      criarCandidato(
        {
          valor: a.valor,
          data,
          descricao: a.estabelecimento ?? '',
          estabelecimento: a.estabelecimento ?? '',
          forma: a.forma,
          origem,
          cnpj: a.cnpj,
          imagem: jpeg,
          textoReconhecido: texto,
        },
        ctx,
      ),
    );
  }
  return out;
}
