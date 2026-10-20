import type { Preco, Radar } from '../schema/radar';
import type { Limite } from './config';
import { diaMes, numeroAuto, valorComUnidade } from './formato';
import { dadoAntigo } from './pregao';
import { ehIntradiario, precosCurados, todosPrecos } from './precos';
import { horaBR } from './edicoes';

export type NivelAlerta = 'info' | 'atencao' | 'alerta' | 'perigo';

export type Alerta = {
  chave: string;
  origem: 'limite' | 'clima' | 'antigo';
  nivel: NivelAlerta;
  icone: string;
  titulo: string;
  texto: string;
  id?: string;
};

/** Limites cruzados por um preço. */
export function limitesCruzados(p: Preco, limites: Limite[]): Limite[] {
  if (p.valor === null || p.valor === undefined) return [];
  const v = p.valor;
  return limites.filter((l) => l.ativo && l.id === p.id && (l.tipo === 'acima' ? v > l.valor : v < l.valor));
}

const NIVEIS: Record<string, NivelAlerta> = {
  info: 'info',
  informativo: 'info',
  baixo: 'info',
  atencao: 'atencao',
  atenção: 'atencao',
  amarelo: 'atencao',
  moderado: 'atencao',
  alerta: 'alerta',
  laranja: 'alerta',
  alto: 'alerta',
  perigo: 'perigo',
  vermelho: 'perigo',
  severo: 'perigo',
  'grande perigo': 'perigo',
};

export const nivelClima = (n: string): NivelAlerta => NIVEIS[n.trim().toLowerCase()] ?? 'atencao';

const ICONES_CLIMA: Record<string, string> = {
  frio: '🥶',
  geada: '❄️',
  chuva: '🌧️',
  temporal: '⛈️',
  tempestade: '⛈️',
  granizo: '🧊',
  vento: '💨',
  seca: '🏜️',
  calor: '🔥',
  neblina: '🌫️',
};

export const iconeClima = (tipo: string) => ICONES_CLIMA[tipo.trim().toLowerCase()] ?? '⚠️';

export const NOMES_NIVEL: Record<NivelAlerta, string> = {
  info: 'Informativo',
  atencao: 'Atenção',
  alerta: 'Alerta',
  perigo: 'Perigo',
};

/** Referência do valor no texto do alerta: intradiário com hora ou data de fechamento. */
function refValor(p: Preco): string {
  if (ehIntradiario(p)) return `intradiário${p.hora_ref ? ` ${horaBR(p.hora_ref)}` : ''} de ${diaMes(p.data_ref)}`;
  return `fechamento, ref. ${diaMes(p.data_ref)}`;
}

/** Todos os alertas de uma edição: limites de preço, clima e (em resumo) dados antigos. */
export function calcularAlertas(r: Radar, limites: Limite[]): Alerta[] {
  const alertas: Alerta[] = [];
  const precos = todosPrecos(r);

  for (const p of precos) {
    for (const l of limitesCruzados(p, limites)) {
      alertas.push({
        chave: `limite-${p.id}-${l.tipo}`,
        origem: 'limite',
        nivel: 'alerta',
        icone: l.tipo === 'acima' ? '📈' : '📉',
        titulo: `${p.nome} ${l.tipo === 'acima' ? 'acima de' : 'abaixo de'} ${numeroAuto(l.valor)}`,
        texto: `Valor no arquivo: ${valorComUnidade(p.valor, p.unidade)} (${refValor(p)}).`,
        id: p.id,
      });
    }
  }

  for (const reg of r.clima?.regioes ?? []) {
    reg.alertas.forEach((a, i) => {
      const periodo = a.inicio ? ` (${diaMes(a.inicio)}${a.fim && a.fim !== a.inicio ? ` a ${diaMes(a.fim)}` : ''})` : '';
      alertas.push({
        chave: `clima-${reg.id}-${i}`,
        origem: 'clima',
        nivel: nivelClima(a.nivel),
        icone: iconeClima(a.tipo),
        titulo: `${reg.nome}: ${a.tipo}${periodo}`,
        texto: a.fonte ? `${a.texto} Fonte: ${a.fonte}.` : a.texto,
      });
    });
  }

  // O resumo de dado antigo olha só o Radar curado (o universo amplo poluiria a faixa de alertas).
  const antigos = precosCurados(r).filter((p) => dadoAntigo(p, r.edicao.data));
  if (antigos.length) {
    alertas.push({
      chave: 'antigos',
      origem: 'antigo',
      nivel: 'info',
      icone: '🕒',
      titulo: `${antigos.length} ${antigos.length === 1 ? 'cotação com dado antigo' : 'cotações com dado antigo'}`,
      texto: antigos.map((p) => `${p.nome} (${diaMes(p.data_ref)})`).join(', ') + '.',
    });
  }

  const ordem: Record<NivelAlerta, number> = { perigo: 0, alerta: 1, atencao: 2, info: 3 };
  return alertas.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}
