import { addDays, parseDateBR, todayISO } from '../dates';
import type { Forma, Tipo } from '../db/schemas';
import { parseMoney } from '../money';

export type ItemTexto = {
  valor: number;
  data: string;
  tipo: Tipo;
  descricao: string;
  forma: Forma | null;
};

const VERBOS_ENTRADA = /\b(recebi|ganhei|entrou|entraram|caiu|caíram|cairam|recebido)\b/i;
const VERBOS = /\b(gastei|paguei|comprei|recebi|ganhei|entrou|entraram|caiu|caíram|cairam|recebido|foi|foram|deu|custou)\b/gi;
const MOEDA = /\b(reais|real|conto|contos|pila|pilas)\b|r\$/gi;
const PREPOSICOES = /^(no|na|nos|nas|em|do|da|dos|das|de|com|pro|pra|para|pelo|pela|o|a)\s+/i;
const PREPOSICOES_FIM = /\s+(no|na|nos|nas|em|do|da|dos|das|de|com|pro|pra|para|pelo|pela|e)$/i;

function detectarForma(s: string): Forma | null {
  if (/\bpix\b|\bconta\b|\bdebito automatico\b/i.test(s)) return 'Conta / Pix';
  if (/\bcart[aã]o\b|\bcr[eé]dito\b|\bd[eé]bito\b/i.test(s)) return 'Cartão';
  if (/\bdinheiro\b|\besp[eé]cie\b/i.test(s)) return 'Dinheiro';
  return null;
}

/**
 * Interpreta frases como "gastei 87 no posto hoje", "42,50 farmácia ontem",
 * "recebi 400 do show", "uber 23,90 05/10". Uma frase por linha.
 */
export function parseFrase(frase: string, now: Date = new Date()): ItemTexto | null {
  let s = ` ${frase.trim()} `;
  if (!s.trim()) return null;
  const hoje = todayISO(now);
  let data = hoje;

  // Datas: hoje / ontem / anteontem / dd/mm(/aa)
  const dm = /\s(?:dia\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?=\s)/.exec(s);
  if (dm) {
    const d = parseDateBR(dm[1]!, now);
    if (d) {
      data = d;
      s = s.replace(dm[0], ' ');
    }
  }
  if (/\banteontem\b/i.test(s)) {
    data = addDays(hoje, -2);
    s = s.replace(/\banteontem\b/gi, ' ');
  } else if (/\bontem\b/i.test(s)) {
    data = addDays(hoje, -1);
    s = s.replace(/\bontem\b/gi, ' ');
  } else if (/\bhoje\b/i.test(s)) {
    s = s.replace(/\bhoje\b/gi, ' ');
  }

  // Valor: primeiro número com cara de dinheiro.
  const vm = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?=\s|$)/i.exec(s);
  if (!vm) return null;
  const valor = parseMoney(vm[1]!);
  if (valor === null || valor <= 0) return null;
  s = s.replace(vm[0], ' ');

  const tipo: Tipo = VERBOS_ENTRADA.test(s) ? 'entrada' : 'saida';
  const forma = detectarForma(s);
  let desc = s
    .replace(VERBOS, ' ')
    .replace(MOEDA, ' ')
    .replace(/(^|\s)(?:(?:no|na|com|via|pelo|pela)\s+)?(pix|cart[aã]o|cr[eé]dito|d[eé]bito|dinheiro)(?=\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < 3; i++) desc = desc.replace(PREPOSICOES, '').replace(PREPOSICOES_FIM, '').trim();
  return { valor, data, tipo, descricao: desc, forma };
}

/** Várias frases separadas por linha ou ponto e vírgula. */
export function parseTextoLivre(texto: string, now: Date = new Date()): ItemTexto[] {
  return texto
    .split(/\n|;/)
    .map((l) => parseFrase(l, now))
    .filter((x): x is ItemTexto => x !== null);
}
