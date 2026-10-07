import { useCallback, useState } from 'react';
import { useToast } from '../../components/Toast';
import type { Origem } from '../../lib/db/schemas';

export type Progresso = { texto: string; pct: number | null; aviso?: string };

/** Processa arquivos escolhidos: fotos e prints (OCR) ou extratos (OFX, CSV, PDF). */
export function useProcessarArquivos() {
  const toast = useToast();
  const [progresso, setProgresso] = useState<Progresso | null>(null);

  const processar = useCallback(
    async (files: File[], _origem: Origem) => {
      if (files.length === 0) return;
      setProgresso(null);
      toast.show('Leitura de arquivos chega na próxima etapa.');
    },
    [toast],
  );

  return { processar, progresso };
}
