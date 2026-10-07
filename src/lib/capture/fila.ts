import type { PlanoDB } from '../db/db';
import type { Transaction } from '../db/schemas';
import { addDays, compareMonths, currentMonth, monthOf, todayISO } from '../dates';
import { chaveEstabelecimento } from '../finance/chave';
import { ehDuplicado } from '../finance/duplicados';
import { newId } from '../id';
import { candidatoValido, type Candidato, type ContextoCategorizacao } from './candidato';

export const MAX_REGRAS = 300;

export async function carregarContexto(database: PlanoDB): Promise<ContextoCategorizacao> {
  const [regras, dicionario] = await Promise.all([database.categoryRules.toArray(), database.keywordDictionary.toArray()]);
  return { regras: new Map(regras.map((r) => [r.chave, r])), dicionario };
}

/**
 * Marca possíveis duplicados (contra lançamentos gravados e contra a própria fila)
 * e os desmarca. Itens já revisados mantêm a seleção.
 */
export async function marcarDuplicadosNaFila(
  database: PlanoDB,
  novos: Candidato[],
  fila: readonly Candidato[],
): Promise<Candidato[]> {
  const datas = novos.map((c) => c.data).sort();
  if (datas.length === 0) return novos;
  const existentes = await database.transactions
    .where('data')
    .between(addDays(datas[0]!, -2), addDays(datas[datas.length - 1]!, 2), true, true)
    .toArray();
  const vistos: { valor: number; data: string }[] = fila
    .filter((c) => c.valor !== null)
    .map((c) => ({ valor: c.valor!, data: c.data }));
  return novos.map((c) => {
    if (c.valor === null) return c;
    const alvo = { valor: c.valor, data: c.data };
    const dup = existentes.some((e) => ehDuplicado(alvo, e)) || vistos.some((v) => ehDuplicado(alvo, v));
    vistos.push(alvo);
    return dup ? { ...c, duplicado: true, selecionado: false } : c;
  });
}

export type ResultadoConfirmacao = {
  salvos: number;
  extraordinarios: number;
  regrasAprendidas: number;
  transacoes: Transaction[];
};

/** Grava os itens selecionados, guarda as fotos escolhidas e aprende as correções. */
export async function confirmarFila(
  database: PlanoDB,
  fila: readonly Candidato[],
  now = new Date(),
): Promise<ResultadoConfirmacao> {
  const itens = fila.filter((c) => c.selecionado && candidatoValido(c));
  const criadoEm = now.toISOString();
  const transacoes: Transaction[] = [];
  let regrasAprendidas = 0;

  await database.transaction('rw', database.transactions, database.receipts, database.categoryRules, async () => {
    for (const c of itens) {
      let comprovanteId: string | null = null;
      if (c.imagem && (c.guardarFoto || c.dedutivel !== null)) {
        comprovanteId = newId();
        await database.receipts.add({ id: comprovanteId, blob: c.imagem, criadoEm, tipoArquivo: c.imagem.type || 'image/jpeg' });
      }
      const t: Transaction = {
        id: newId(),
        data: c.data,
        mes: monthOf(c.data),
        tipo: c.tipo,
        categoria: c.categoria,
        descricao: c.descricao,
        estabelecimento: c.estabelecimento,
        valor: c.valor!,
        forma: c.forma,
        origem: c.origem,
        fixoId: null,
        dedutivel: c.dedutivel,
        cnpj: c.cnpj,
        beneficiario: c.beneficiario ?? (c.dedutivel ? c.estabelecimento || c.descricao : null),
        reembolsado: false,
        reembolsadoEm: null,
        comprovanteId,
        comprovantePendente: c.dedutivel !== null && comprovanteId === null,
        criadoEm,
        alocado: false,
      };
      transacoes.push(t);

      const mudou = c.tipo !== c.sugestao.tipo || c.categoria !== c.sugestao.categoria;
      const chave = chaveEstabelecimento(c.estabelecimento || c.descricao);
      if (mudou && chave) {
        await database.categoryRules.put({ chave, tipo: c.tipo, categoria: c.categoria, atualizadoEm: criadoEm });
        regrasAprendidas++;
      }
    }
    await database.transactions.bulkAdd(transacoes);
    await limitarRegras(database);
  });

  return {
    salvos: transacoes.length,
    extraordinarios: transacoes.filter((t) => t.tipo === 'extra_in').length,
    regrasAprendidas,
    transacoes,
  };
}

/** Mantém no máximo 300 regras, removendo as mais antigas. */
export async function limitarRegras(database: PlanoDB, max = MAX_REGRAS): Promise<void> {
  const total = await database.categoryRules.count();
  if (total <= max) return;
  const antigas = await database.categoryRules
    .orderBy('atualizadoEm')
    .limit(total - max)
    .primaryKeys();
  await database.categoryRules.bulkDelete(antigas);
}

/** Lança os fixos ativos no mês, sem duplicar os que já foram lançados. Retorna quantos entraram. */
export async function lancarFixosDoMes(database: PlanoDB, mes: string, now = new Date()): Promise<number> {
  const hoje = todayISO(now);
  const data = compareMonths(mes, currentMonth(now)) === 0 ? hoje : `${mes}-01`;
  const criadoEm = now.toISOString();
  return database.transaction('rw', database.transactions, database.fixedItems, async () => {
    const fixos = (await database.fixedItems.toArray()).filter((f) => f.ativo);
    const lancados = new Set(
      (await database.transactions.where('mes').equals(mes).toArray()).map((t) => t.fixoId).filter(Boolean),
    );
    const novos: Transaction[] = fixos
      .filter((f) => !lancados.has(f.id))
      .map((f) => ({
        id: newId(),
        data,
        mes,
        tipo: f.tipo,
        categoria: f.categoria,
        descricao: f.descricao || f.categoria,
        estabelecimento: '',
        valor: f.valor,
        forma: 'Conta / Pix',
        origem: 'fixo',
        fixoId: f.id,
        dedutivel: null,
        cnpj: null,
        beneficiario: null,
        reembolsado: false,
        reembolsadoEm: null,
        comprovanteId: null,
        comprovantePendente: false,
        criadoEm,
        alocado: false,
      }));
    await database.transactions.bulkAdd(novos);
    return novos.length;
  });
}
