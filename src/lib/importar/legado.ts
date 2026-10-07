import { z } from 'zod';
import { CATEGORIAS, categoriaPadrao } from '../db/categories';
import type { PlanoDB } from '../db/db';
import {
  ORIGENS,
  type CategoryRule,
  type Closing,
  type Debt,
  type Dedutivel,
  type FixedItem,
  type Forma,
  type ModoLongevidade,
  type Origem,
  type PapelDivida,
  type Projecao,
  type Settings,
  type Snapshot,
  type Tipo,
  type Transaction,
} from '../db/schemas';
import { getSettings } from '../db/settings';
import { isValidISODate, isValidMonth, parseDateBR } from '../dates';
import { chaveEstabelecimento } from '../finance/chave';
import { stableId } from '../id';
import { cents, parseMoney } from '../money';

/* Formato do app anterior: {config, months, fech}. Tudo é lido de forma tolerante. */
const num = z.union([z.number(), z.string()]).nullish();
const str = z.union([z.string(), z.number()]).nullish();

const dividaSchema = z.object({ nome: str, saldo: num, taxa: num, parcela: num }).passthrough();
const itemSchema = z
  .object({
    tipo: str,
    cat: str,
    desc: str,
    valor: num,
    data: str,
    forma: str,
    estab: str,
    dedutivel: z.unknown().optional(),
    cnpj: str,
    beneficiario: str,
    recebido: z.unknown().optional(),
    fixoId: str,
    origem: str,
    assetId: str,
  })
  .passthrough();

export const legadoSchema = z.object({
  config: z
    .object({
      fixos: z.array(z.object({ tipo: str, cat: str, desc: str, valor: num }).passthrough()).nullish(),
      debts: z.record(z.string(), dividaSchema.nullish()).nullish(),
      reserva: num,
      capital: num,
      longev: z.unknown().optional(),
      ultimoAplicado: str,
      jurosPagos: num,
      historico: z.array(z.record(z.string(), z.unknown())).nullish(),
      tetos: z.record(z.string(), num).nullish(),
      regras: z.record(z.string(), z.unknown()).nullish(),
      fipe: num,
      proj: z.record(z.string(), z.unknown()).nullish(),
    })
    .passthrough(),
  months: z.record(z.string(), z.array(itemSchema)).nullish(),
  fech: z.record(z.string(), z.unknown()).nullish(),
});

export type Legado = z.infer<typeof legadoSchema>;

/** Reais (número ou texto) → centavos. */
function reais(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return cents(v);
  if (typeof v === 'string') return parseMoney(v) ?? 0;
  return 0;
}

function texto(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

/** Taxa mensal em %. Valores abaixo de 0,1 são tratados como fração (0,0185 → 1,85%). */
function taxa(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 0.1 ? Math.round(n * 100 * 10_000) / 10_000 : n;
}

const TIPOS_LEGADO: Record<string, Tipo> = {
  saida: 'saida',
  saída: 'saida',
  despesa: 'saida',
  gasto: 'saida',
  entrada: 'entrada',
  receita: 'entrada',
  trabalho: 'trabalho',
  reembolsavel: 'trabalho',
  reembolsável: 'trabalho',
  extra_in: 'extra_in',
  extrain: 'extra_in',
  extra: 'extra_in',
  extra_out: 'extra_out',
  extraout: 'extra_out',
  destino: 'extra_out',
};

function tipo(v: unknown): Tipo | null {
  return TIPOS_LEGADO[texto(v).toLowerCase()] ?? null;
}

function categoria(t: Tipo, v: unknown): string {
  const c = texto(v);
  if (CATEGORIAS[t].includes(c)) return c;
  const achada = CATEGORIAS[t].find(
    (x) => x.toLowerCase() === c.toLowerCase() || x.toLowerCase().startsWith(`${c.toLowerCase()} `),
  );
  return achada ?? (c || categoriaPadrao(t));
}

function forma(v: unknown): Forma {
  const f = texto(v).toLowerCase();
  if (f.includes('cart') || f.includes('créd') || f.includes('cred') || f.includes('déb') || f.includes('deb')) return 'Cartão';
  if (f.includes('dinheiro') || f.includes('espécie')) return 'Dinheiro';
  return f ? 'Conta / Pix' : 'Cartão';
}

function dedutivel(v: unknown): Dedutivel {
  const d = texto(v).toLowerCase();
  if (d.startsWith('saud') || d.startsWith('saúd')) return 'saude';
  if (d.startsWith('educ')) return 'educacao';
  return null;
}

function data(v: unknown, mes: string): string {
  const s = texto(v);
  if (isValidISODate(s.slice(0, 10))) return s.slice(0, 10);
  const br = parseDateBR(s, new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 28));
  return br ?? `${mes}-01`;
}

const PAPEIS: Record<string, PapelDivida> = {
  consig: 'consignado',
  consignado: 'consignado',
  cdc: 'cdc',
  mae: 'acordo',
  acordo: 'acordo',
};
const NOMES_PADRAO: Record<PapelDivida, string> = {
  consignado: 'Consignado',
  cdc: 'CDC',
  acordo: 'Acordo familiar',
  outra: 'Dívida',
};

function modo(v: unknown): ModoLongevidade {
  return texto(v).includes('6') ? '6/6' : '2/2';
}

function projecao(p: Record<string, unknown> | null | undefined, atual: Projecao): Projecao {
  if (!p) return atual;
  const out = { ...atual };
  for (const [k, v] of Object.entries(p)) {
    const key = k.toLowerCase();
    if (/manual|fluxo|resultado/.test(key)) out.resultadoManual = v === null || v === '' ? null : reais(v);
    else if (/piso/.test(key)) out.pisoReserva = reais(v);
    else if (/nov/.test(key)) out.decimoNov = reais(v);
    else if (/dez/.test(key)) out.decimoDez = reais(v);
    else if (/plr|mar/.test(key)) out.plrMarco = reais(v);
    else if (/restit|jun/.test(key)) out.restituicaoJunho = reais(v);
    else if (/janela|longev/.test(key)) out.janelaLongevidade = isValidMonth(texto(v)) ? texto(v) : null;
  }
  return out;
}

export type PlanoImportacao = {
  settings: Partial<Settings>;
  debts: Debt[];
  fixedItems: FixedItem[];
  transactions: Transaction[];
  closings: Closing[];
  snapshots: Snapshot[];
  categoryRules: CategoryRule[];
};

export type ResumoImportacao = {
  meses: number;
  lancamentos: number;
  comprovantesPendentes: number;
  fixos: number;
  dividas: number;
  fechamentos: number;
  historico: number;
  regras: number;
  ignorados: number;
  reserva: number;
  capital: number;
  avisos: string[];
};

/** Converte o JSON do app anterior. Ids determinísticos garantem importação idempotente. */
export function converterLegado(
  bruto: unknown,
  atual: Settings,
  agora = new Date(),
): { plano: PlanoImportacao; resumo: ResumoImportacao } {
  const parsed = legadoSchema.safeParse(bruto);
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    throw new Error(
      `Formato não reconhecido${p ? ` (${p.path.join('.')}: ${p.message})` : ''}. Esperado {config, months, fech}.`,
    );
  }
  const { config, months, fech } = parsed.data;
  const avisos: string[] = [];
  const criadoEm = agora.toISOString();

  // Fixos
  const fixedItems: FixedItem[] = (config.fixos ?? []).flatMap((f, i) => {
    const t = tipo(f.tipo) === 'entrada' ? 'entrada' : 'saida';
    const valor = Math.abs(reais(f.valor));
    if (!valor) return [];
    return [
      {
        id: stableId('fixo', `${i}|${t}|${texto(f.cat)}|${texto(f.desc)}`),
        tipo: t,
        categoria: categoria(t, f.cat),
        descricao: texto(f.desc),
        valor,
        ativo: true,
      },
    ];
  });
  const fixoPorIndice = new Map(
    (config.fixos ?? []).map((f, i) => [
      String(i),
      stableId('fixo', `${i}|${tipo(f.tipo) === 'entrada' ? 'entrada' : 'saida'}|${texto(f.cat)}|${texto(f.desc)}`),
    ]),
  );

  // Dívidas
  const debts: Debt[] = Object.entries(config.debts ?? {}).flatMap(([k, d], ordem) => {
    if (!d) return [];
    const papel = PAPEIS[k.toLowerCase()] ?? 'outra';
    return [
      {
        id: stableId('divida', k),
        nome: texto(d.nome) || NOMES_PADRAO[papel],
        papel,
        saldo: Math.max(0, reais(d.saldo)),
        taxaMensal: taxa(d.taxa),
        parcela: Math.max(0, reais(d.parcela)),
        ordem,
        ativo: true,
      },
    ];
  });

  // Lançamentos
  const transactions: Transaction[] = [];
  let ignorados = 0;
  const ocorrencias = new Map<string, number>();
  for (const [mes, itens] of Object.entries(months ?? {})) {
    if (!isValidMonth(mes)) {
      avisos.push(`Mês inválido ignorado: ${mes}.`);
      ignorados += itens.length;
      continue;
    }
    for (const it of itens) {
      const t = tipo(it.tipo);
      const v = Math.abs(reais(it.valor));
      if (!t || !v) {
        ignorados++;
        continue;
      }
      const d = data(it.data, mes);
      const base = `${d}|${t}|${texto(it.cat)}|${v}|${texto(it.desc)}|${texto(it.estab)}`;
      const n = (ocorrencias.get(base) ?? 0) + 1;
      ocorrencias.set(base, n);
      const ded = t === 'saida' ? dedutivel(it.dedutivel) : null;
      const fixo = texto(it.fixoId);
      const origem = texto(it.origem) as Origem;
      transactions.push({
        id: stableId('lanc', `${base}|${n}`),
        data: d,
        mes: d.slice(0, 7),
        tipo: t,
        categoria: categoria(t, it.cat),
        descricao: texto(it.desc),
        estabelecimento: texto(it.estab),
        valor: v,
        forma: forma(it.forma),
        origem: (ORIGENS as readonly string[]).includes(origem) ? origem : 'importacao',
        fixoId: fixo ? (fixoPorIndice.get(fixo) ?? `legado-${fixo}`) : null,
        dedutivel: ded,
        cnpj: texto(it.cnpj) || null,
        beneficiario: texto(it.beneficiario) || null,
        reembolsado: t === 'trabalho' ? Boolean(it.recebido) : false,
        reembolsadoEm: null,
        comprovanteId: null,
        // As fotos antigas não vêm no JSON.
        comprovantePendente: Boolean(texto(it.assetId)),
        criadoEm,
        alocado: t === 'extra_in',
      });
    }
  }
  if (ignorados) avisos.push(`${ignorados} itens sem tipo ou valor válido foram ignorados.`);

  // Fechamentos
  const closings: Closing[] = Object.entries(fech ?? {})
    .filter(([m]) => isValidMonth(m))
    .map(([mes, t]) => ({ mes, texto: typeof t === 'string' ? t : JSON.stringify(t, null, 1), criadoEm }));

  // Histórico → snapshots
  const snapshots: Snapshot[] = (config.historico ?? []).flatMap((h) => {
    const mes = texto(h.mes ?? h.month ?? h.m);
    if (!isValidMonth(mes)) return [];
    const dividas = debts
      .map((d) => {
        const chave = Object.keys(PAPEIS).find((k) => PAPEIS[k] === d.papel && k in h);
        return chave ? { id: d.id, nome: d.nome, saldo: reais(h[chave]) } : null;
      })
      .filter((x): x is { id: string; nome: string; saldo: number } => x !== null);
    return [
      {
        mes,
        reserva: reais(h.reserva),
        capital: reais(h.capital),
        dividas,
        jurosDoMes: reais(h.juros ?? h.jurosMes ?? h.jurosDoMes),
      },
    ];
  });
  if ((config.historico?.length ?? 0) > snapshots.length) avisos.push('Parte do histórico não tinha mês válido e foi ignorada.');

  // Regras aprendidas
  const categoryRules: CategoryRule[] = Object.entries(config.regras ?? {}).flatMap(([k, r]) => {
    const chave = chaveEstabelecimento(k) || k.toLowerCase();
    const obj = typeof r === 'object' && r !== null ? (r as Record<string, unknown>) : { cat: r };
    const t = tipo(obj.tipo) ?? 'saida';
    const c = texto(obj.cat ?? obj.categoria);
    if (!chave || !c) return [];
    return [{ chave, tipo: t, categoria: categoria(t, c), atualizadoEm: criadoEm }];
  });

  const tetos: Record<string, number> = {};
  for (const [c, v] of Object.entries(config.tetos ?? {})) {
    const valor = reais(v);
    if (valor > 0) tetos[categoria('saida', c)] = valor;
  }

  const ultimo = texto(config.ultimoAplicado);
  const settings: Partial<Settings> = {
    reserva: reais(config.reserva),
    capital: reais(config.capital),
    longevidadeModo: modo(config.longev),
    ultimoMesAplicado: isValidMonth(ultimo) ? ultimo : atual.ultimoMesAplicado,
    jurosPagos: reais(config.jurosPagos),
    fipeCarro: reais(config.fipe),
    tetos: { ...atual.tetos, ...tetos },
    projecao: projecao(config.proj as Record<string, unknown> | null | undefined, atual.projecao),
  };
  if (debts.some((d) => d.taxaMensal > 0 && d.taxaMensal < 0.5)) avisos.push('Confira as taxas de juros das dívidas em Ajustes.');

  return {
    plano: { settings, debts, fixedItems, transactions, closings, snapshots, categoryRules },
    resumo: {
      meses: new Set(transactions.map((t) => t.mes)).size,
      lancamentos: transactions.length,
      comprovantesPendentes: transactions.filter((t) => t.comprovantePendente).length,
      fixos: fixedItems.length,
      dividas: debts.length,
      fechamentos: closings.length,
      historico: snapshots.length,
      regras: categoryRules.length,
      ignorados,
      reserva: settings.reserva ?? 0,
      capital: settings.capital ?? 0,
      avisos,
    },
  };
}

/** Grava a importação. Idempotente: os ids são determinísticos e os registros são substituídos. */
export async function gravarLegado(database: PlanoDB, plano: PlanoImportacao): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.settings,
      database.debts,
      database.fixedItems,
      database.transactions,
      database.closings,
      database.snapshots,
      database.categoryRules,
    ],
    async () => {
      const atual = await getSettings(database);
      await database.settings.put({ ...atual, ...plano.settings, id: 'main' });
      await database.debts.bulkPut(plano.debts);
      await database.fixedItems.bulkPut(plano.fixedItems);
      // Mantém comprovantes já anexados em importações anteriores.
      const existentes = new Map(
        (await database.transactions.bulkGet(plano.transactions.map((t) => t.id))).filter(Boolean).map((t) => [t!.id, t!]),
      );
      await database.transactions.bulkPut(
        plano.transactions.map((t) => {
          const e = existentes.get(t.id);
          return e?.comprovanteId ? { ...t, comprovanteId: e.comprovanteId, comprovantePendente: false } : t;
        }),
      );
      await database.closings.bulkPut(plano.closings);
      await database.snapshots.bulkPut(plano.snapshots);
      await database.categoryRules.bulkPut(plano.categoryRules);
    },
  );
}
