import { afterEach, describe, expect, it, vi } from 'vitest';
import novo from '../../public/exemplos/radar_exemplo_editorias.json';
import legado from '../../public/exemplos/radar_exemplo_legado.json';
import { radarSchema } from '../schema/radar';
import {
  agruparPorEditoria,
  contarPorEditoria,
  EDITORIAS,
  editoriaDe,
  ordenarNoticias,
  relevanciaTotal,
  SLUGS_EDITORIA,
} from './editorias';

afterEach(() => vi.restoreAllMocks());

describe('editoriaDe', () => {
  it('usa o slug do arquivo quando é válido', () => {
    expect(editoriaDe({ editoria: 'bancos_cooperativas', categoria: 'mercado' })).toBe('bancos_cooperativas');
  });
  it('slug inválido sem categoria → outras', () => {
    expect(editoriaDe({ editoria: 'esportes' })).toBe('outras');
  });
  it('mapeia as categorias legadas', () => {
    expect(editoriaDe({ categoria: 'mercado' })).toBe('mercados');
    expect(editoriaDe({ categoria: 'Mundo' })).toBe('mundo');
    expect(editoriaDe({ categoria: 'agro' })).toBe('agro');
    expect(editoriaDe({ categoria: 'eventos' })).toBe('outras');
    expect(editoriaDe({})).toBe('outras');
  });
  it('"brasil" vira Política e regulação com palavra-chave de política; senão, Economia', () => {
    expect(editoriaDe({ categoria: 'brasil', titulo: 'Senado aprova PEC dos precatórios' })).toBe('politica_regulacao');
    expect(editoriaDe({ categoria: 'brasil', titulo: 'Governo edita', resumo: 'Nova MP muda regra do crédito' })).toBe(
      'politica_regulacao',
    );
    expect(editoriaDe({ categoria: 'brasil', titulo: 'Câmara analisa projeto de lei' })).toBe('politica_regulacao');
    expect(editoriaDe({ categoria: 'brasil', titulo: 'Varejo cresce acima do esperado', resumo: 'Vendas sobem' })).toBe(
      'economia',
    );
    // "mp" só como palavra inteira: "ampliam" não conta.
    expect(editoriaDe({ categoria: 'brasil', titulo: 'Empresas ampliam investimentos' })).toBe('economia');
  });
});

describe('relevância e ordenação', () => {
  const x = (id: string, hora: string, total?: number, data = '2026-10-29') => ({
    id,
    data,
    hora,
    item: { titulo: id, ...(total !== undefined ? { relevancia: { total } } : {}) },
  });
  it('relevanciaTotal não inventa nota', () => {
    expect(relevanciaTotal({ relevancia: { total: 8 } })).toBe(8);
    expect(relevanciaTotal({ relevancia: { mercado: 3 } })).toBeNull();
    expect(relevanciaTotal({})).toBeNull();
  });
  it('por total decrescente, empate pela hora mais recente, sem nota por último (por hora)', () => {
    const r = ordenarNoticias([x('a', '07:00', 5), x('b', '09:00'), x('c', '08:00', 9), x('d', '10:00', 5), x('e', '06:00')]);
    expect(r.map((i) => i.id)).toEqual(['c', 'd', 'a', 'b', 'e']);
  });
  it('"Mais recentes" ordena só por data e hora', () => {
    const r = ordenarNoticias([x('a', '07:00', 5), x('b', '09:00'), x('c', '08:00', 9, '2026-10-28')], 'recentes');
    expect(r.map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('agrupamento por editoria', () => {
  const it_ = (editoria?: string, categoria?: string) => ({ item: { editoria, categoria, titulo: 't' } });
  it('ordem fixa; vazias presentes e marcadas; outras no fim e só com itens', () => {
    const g = agruparPorEditoria([it_('agro'), it_('mercados'), it_(undefined, 'eventos')], ['tecnologia_energia']);
    expect(g.map((x) => x.editoria.slug)).toEqual(SLUGS_EDITORIA);
    expect(g.at(-1)!.editoria.slug).toBe('outras');
    const tech = g.find((x) => x.editoria.slug === 'tecnologia_energia')!;
    expect(tech.itens).toEqual([]);
    expect(tech.semDestaque).toBe(true);
    expect(agruparPorEditoria([it_('agro')]).map((x) => x.editoria.slug)).not.toContain('outras');
  });
  it('avisa (sem cortar) quando uma editoria passa de 4 itens', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const g = agruparPorEditoria(Array.from({ length: 5 }, () => it_('agro')));
    expect(g.find((x) => x.editoria.slug === 'agro')!.itens).toHaveLength(5);
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('"agro" com 5 itens'));
  });
  it('a ordem e os rótulos seguem a tabela', () => {
    expect(EDITORIAS.map((e) => e.icone).join('')).toBe('🏦📈🧮🏢💰🌾🤖🌍🏛️🗞️');
  });
});

describe('schema com editorias', () => {
  it('JSON novo valida e traz editoria, relevância, canal e editorias sem destaque', () => {
    const r = radarSchema.parse(novo);
    expect(r.edicao.exemplo).toBe(true);
    expect(r.noticias).toHaveLength(18);
    expect(r.editorias_sem_destaque).toEqual(['tecnologia_energia']);
    const c = contarPorEditoria(r.noticias.map((item) => ({ item })));
    expect(c.tecnologia_energia).toBe(0);
    expect(Math.max(...Object.values(c))).toBeLessThanOrEqual(4);
    expect(r.noticias.find((n) => n.canal_transmissao)?.editoria).toBe('politica_regulacao');
  });
  it('JSON legado valida e as editorias saem da categoria', () => {
    const r = radarSchema.parse(legado);
    expect(r.editorias_sem_destaque).toBeUndefined();
    expect(r.noticias.map(editoriaDe)).toEqual(['mercados', 'mundo', 'agro', 'politica_regulacao', 'economia', 'outras']);
  });
  it('slug desconhecido não quebra: vira "outras" com aviso; editorias sem destaque desconhecidas são descartadas', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bruto = structuredClone(novo) as { noticias: { editoria: string }[]; editorias_sem_destaque: string[] };
    bruto.noticias[0]!.editoria = 'esportes';
    bruto.editorias_sem_destaque = ['tecnologia_energia', 'esportes'];
    const r = radarSchema.safeParse(bruto);
    expect(r.success).toBe(true);
    expect(r.data!.noticias[0]!.editoria).toBe('outras');
    expect(r.data!.editorias_sem_destaque).toEqual(['tecnologia_energia']);
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('"esportes"'));
  });
  it('relevância fora da escala é erro de validação', () => {
    const bruto = structuredClone(novo) as { noticias: { relevancia: { mercado: number } }[] };
    bruto.noticias[0]!.relevancia.mercado = 7;
    expect(radarSchema.safeParse(bruto).success).toBe(false);
  });
});
