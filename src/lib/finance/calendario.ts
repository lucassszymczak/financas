import { addDays, addMonths, daysInMonth, monthNumber } from '../dates';

export type Evento = { data: string; titulo: string; tipo: 'pagamento' | 'plano' | 'renda' | 'lembrete' };

function dia(mes: string, d: number): string {
  return `${mes}-${String(Math.min(d, daysInMonth(mes))).padStart(2, '0')}`;
}

/** Eventos fixos de um mês. */
export function eventosDoMes(mes: string): Evento[] {
  const m = monthNumber(mes);
  const ev: Evento[] = [
    { data: dia(mes, 1), titulo: 'Fechar o mês anterior', tipo: 'lembrete' },
    { data: dia(mes, 11), titulo: 'Fatura do cartão (integral)', tipo: 'pagamento' },
    { data: dia(mes, 25), titulo: 'Parcela do CDC', tipo: 'pagamento' },
  ];
  if (m === 6 || m === 11) ev.push({ data: dia(mes, 1), titulo: 'Janela do Longevidade', tipo: 'plano' });
  if (m === 11) ev.push({ data: dia(mes, 30), titulo: '13º salário (1ª parcela)', tipo: 'renda' });
  if (m === 12) ev.push({ data: dia(mes, 20), titulo: '13º salário (2ª parcela)', tipo: 'renda' });
  if (m === 3 || m === 9) ev.push({ data: dia(mes, 1), titulo: 'PLR neste mês', tipo: 'renda' });
  if (m === 3) ev.push({ data: dia(mes, 1), titulo: 'Declaração do IR: separar comprovantes', tipo: 'lembrete' });
  return ev;
}

/** Próximos eventos a partir de hoje, incluindo o lembrete semanal de backup. */
export function proximosEventos(hoje: string, dias: number, ultimoBackup: string | null): Evento[] {
  const fim = addDays(hoje, dias);
  const meses: string[] = [];
  for (let m = hoje.slice(0, 7); m <= fim.slice(0, 7); m = addMonths(m, 1)) meses.push(m);
  const ev = meses.flatMap(eventosDoMes).filter((e) => e.data >= hoje && e.data <= fim);
  const proxBackup = ultimoBackup ? addDays(ultimoBackup.slice(0, 10), 7) : hoje;
  for (let d = proxBackup < hoje ? hoje : proxBackup; d <= fim; d = addDays(d, 7)) {
    ev.push({ data: d, titulo: 'Backup semanal', tipo: 'lembrete' });
  }
  return ev.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}
