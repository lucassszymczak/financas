import { useCallback, useState } from 'react';
import { useToast } from '../../components/Toast';
import { useFila } from '../../hooks/FilaContext';
import type { Candidato } from '../../lib/capture/candidato';
import {
  assinaturaCSV,
  aplicarMapeamento,
  detectarMapeamento,
  detectarSeparador,
  parseCSV,
  type Deteccao,
} from '../../lib/capture/csv';
import { decodificarTexto } from '../../lib/capture/extrato';
import { carregarContexto } from '../../lib/capture/fila';
import { linhasParaCandidatos } from '../../lib/capture/importarExtrato';
import { pareceOFX, parseOFX } from '../../lib/capture/ofx';
import { parseLinhasExtrato } from '../../lib/capture/pdfLinhas';
import { db } from '../../lib/db/db';
import type { Origem } from '../../lib/db/schemas';
import { processarImagens, ocrDeImagens } from './ocrFluxo';

export type Progresso = { texto: string; pct: number | null; aviso?: string };

export type CsvPendente = {
  nome: string;
  rows: string[][];
  deteccao: Deteccao | null;
  assinatura: string;
  /** Itens já colocados na fila com a detecção automática (para "Ajustar colunas"). */
  tmpIds: string[];
};

function extensao(nome: string): string {
  return nome.toLowerCase().split('.').pop() ?? '';
}

/** Processa arquivos escolhidos: fotos e prints (OCR) ou extratos (OFX, CSV, PDF). */
export function useProcessarArquivos() {
  const toast = useToast();
  const { adicionar } = useFila();
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [csv, setCsv] = useState<CsvPendente | null>(null);
  const [ultimoCsv, setUltimoCsv] = useState<CsvPendente | null>(null);

  const adicionarCsv = useCallback(
    async (p: CsvPendente, m: Deteccao) => {
      const ctx = await carregarContexto(db);
      const linhas = aplicarMapeamento(p.rows, m);
      const cands = linhasParaCandidatos(linhas, m.positivoEhSaida ? 'Cartão' : 'Conta / Pix', ctx);
      await adicionar(cands);
      setUltimoCsv({ ...p, deteccao: m, tmpIds: cands.map((c) => c.tmpId) });
      return cands.length;
    },
    [adicionar],
  );

  const processarExtrato = useCallback(
    async (file: File): Promise<number> => {
      const ext = extensao(file.name);
      const buf = await file.arrayBuffer();
      const ctx = await carregarContexto(db);

      if (ext === 'pdf' || file.type === 'application/pdf') {
        setProgresso({ texto: `Lendo ${file.name}…`, pct: null });
        const { extrairLinhasPDF, rasterizarPDF } = await import('../../lib/capture/pdf');
        const { linhas, temTexto } = await extrairLinhasPDF(buf);
        let itens = temTexto ? parseLinhasExtrato(linhas) : [];
        if (!temTexto) {
          const paginas = await rasterizarPDF(buf);
          const textos = await ocrDeImagens(paginas, setProgresso);
          itens = parseLinhasExtrato(textos.flatMap((t) => t.split('\n')));
        }
        const cands = linhasParaCandidatos(itens, 'Cartão', ctx);
        await adicionar(cands);
        return cands.length;
      }

      const texto = decodificarTexto(buf);
      if (ext === 'ofx' || ext === 'qfx' || pareceOFX(texto)) {
        const r = parseOFX(texto);
        const cands = linhasParaCandidatos(r.linhas, r.cartao ? 'Cartão' : 'Conta / Pix', ctx);
        await adicionar(cands);
        return cands.length;
      }

      // CSV
      const sep = detectarSeparador(texto);
      const rows = parseCSV(texto, sep);
      const assinatura = assinaturaCSV(rows);
      const salvo = assinatura ? await db.csvMappings.filter((m) => m.assinatura === assinatura).first() : undefined;
      const deteccao = salvo ?? detectarMapeamento(rows, sep);
      const pend: CsvPendente = { nome: file.name, rows, deteccao, assinatura, tmpIds: [] };
      if (!deteccao) {
        setCsv(pend);
        return 0;
      }
      return adicionarCsv(pend, deteccao);
    },
    [adicionar, adicionarCsv],
  );

  const processar = useCallback(
    async (files: File[], origem: Origem) => {
      if (files.length === 0) return;
      try {
        if (origem === 'extrato') {
          let total = 0;
          for (const f of files) total += await processarExtrato(f);
          setProgresso(null);
          if (total > 0) toast.show(`${total} lançamentos para revisar`);
          else if (!csv) toast.show('Nenhum lançamento encontrado no arquivo.');
        } else {
          const cands: Candidato[] = await processarImagens(files, origem, setProgresso);
          await adicionar(cands);
          setProgresso(null);
        }
      } catch (e) {
        console.error(e);
        setProgresso(null);
        toast.show(`Não consegui ler: ${(e as Error).message}`);
      }
    },
    [processarExtrato, adicionar, toast, csv],
  );

  return { processar, progresso, csv, setCsv, adicionarCsv, ultimoCsv, setUltimoCsv };
}
