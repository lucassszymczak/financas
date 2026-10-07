import { monthLabel } from '../dates';
import type { ModoLongevidade } from '../db/schemas';
import { formatBRL } from '../money';
import { LIMITE_LONGEVIDADE, proximaJanela, regraLongevidade } from './longevidade';

export type Veredito = { tom: 'pos' | 'neg' | 'neutro'; titulo: string; detalhe: string };

/** Texto da regra do Longevidade para um resultado (ou previsão) do mês. */
export function vereditoLongevidade(params: {
  valor: number;
  estimativa: boolean;
  modo: ModoLongevidade;
  mes: string;
}): Veredito {
  const janela = monthLabel(proximaJanela(params.mes));
  const base = params.estimativa ? 'A previsão' : 'O resultado';
  if (params.modo === '6/6') {
    return {
      tom: params.valor >= LIMITE_LONGEVIDADE ? 'pos' : 'neg',
      titulo: 'Longevidade já em 6/6',
      detalhe:
        params.valor >= LIMITE_LONGEVIDADE
          ? `${base} está dentro do limite de −${formatBRL(-LIMITE_LONGEVIDADE, { semCentavos: true })}.`
          : `${base} está abaixo de −R$ 500. Atenção ao fluxo.`,
    };
  }
  if (regraLongevidade(params.valor) === 'subir') {
    return { tom: 'pos', titulo: `Pode subir para 6/6 em ${janela}`, detalhe: `${base} está a partir de −R$ 500.` };
  }
  return { tom: 'neg', titulo: 'Esperar', detalhe: `${base} está abaixo de −R$ 500. Próxima janela: ${janela}.` };
}
