import type { Candidato } from '../../lib/capture/candidato';
import type { Origem } from '../../lib/db/schemas';
import type { Progresso } from './useProcessarArquivos';

export async function processarImagens(_files: File[], _origem: Origem, _p: (p: Progresso | null) => void): Promise<Candidato[]> {
  throw new Error('leitura de fotos ainda não disponível');
}

export async function ocrDeImagens(_imgs: Blob[], _p: (p: Progresso | null) => void): Promise<string[]> {
  throw new Error('PDF sem texto ainda não é suportado');
}
