import type { EventoAgenda } from '../schema/radar';
import { FUSO } from './formato';

/** Diferença (em minutos) entre a hora local de um fuso e UTC num instante. */
function offsetMin(fuso: string, instante: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instante);
  const v = (t: string) => Number(partes.find((p) => p.type === t)?.value);
  const local = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'));
  return (local - instante.getTime()) / 60000;
}

/**
 * Converte data e hora de um fuso para o horário de Brasília.
 * Devolve a data (pode mudar de dia) e a hora HH:MM. Fuso inválido ou ausente = já está em Brasília.
 */
export function paraBrasilia(data: string, hora: string, fuso?: string | null): { data: string; hora: string } {
  if (!fuso || fuso === FUSO) return { data, hora };
  try {
    const [a, m, d] = data.split('-').map(Number);
    const [h, mi] = hora.split(':').map(Number);
    const ingenuo = Date.UTC(a!, m! - 1, d!, h!, mi!);
    const instante = new Date(ingenuo - offsetMin(fuso, new Date(ingenuo)) * 60000);
    const sp = new Date(instante.getTime() + offsetMin(FUSO, instante) * 60000);
    return { data: sp.toISOString().slice(0, 10), hora: sp.toISOString().slice(11, 16) };
  } catch {
    return { data, hora };
  }
}

export type EventoBrasilia = EventoAgenda & { dataBr: string; horaBr: string | null; convertido: boolean };

export function eventosEmBrasilia(eventos: EventoAgenda[]): EventoBrasilia[] {
  return eventos
    .map((e) => {
      if (!e.hora) return { ...e, dataBr: e.data, horaBr: null, convertido: false };
      const b = paraBrasilia(e.data, e.hora, e.fuso);
      return { ...e, dataBr: b.data, horaBr: b.hora, convertido: !!e.fuso && e.fuso !== FUSO };
    })
    .sort((a, b) => (a.dataBr + (a.horaBr ?? '99')).localeCompare(b.dataBr + (b.horaBr ?? '99')));
}
