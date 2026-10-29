import { describe, expect, it } from 'vitest';
import manha from '../../public/exemplos/radar_2026-10-21.json';
import meioDia from '../../public/exemplos/radar_2026-10-21_1230.json';
import { radarSchema, type Noticia } from '../schema/radar';
import {
  fundirNoticias,
  filtrarNoticias,
  jaccard,
  LIMIAR_TITULO,
  mesmaNoticia,
  motivoMesma,
  normalizarUrl,
  palavrasTitulo,
} from './noticias';

const rM = radarSchema.parse(manha);
const rT = radarSchema.parse(meioDia);

const n = (p: Partial<Noticia> & { id: string; titulo: string }): Noticia => ({
  resumo: '',
  ativos_afetados: [],
  fontes: [],
  ...p,
});

describe('mesmaNoticia (regra de fusão)', () => {
  it('1: atualiza_id aponta para o id da outra', () => {
    expect(motivoMesma(n({ id: 'a', titulo: 'X' }), n({ id: 'b', titulo: 'Y', atualiza_id: 'a' }))).toBe(1);
  });
  it('2: mesmo id', () => {
    expect(motivoMesma(n({ id: 'a', titulo: 'X' }), n({ id: 'a', titulo: 'Outro título' }))).toBe(2);
  });
  it('3: id diferente com URL em comum (normalizada)', () => {
    const a = n({ id: 'a', titulo: 'X', fontes: [{ nome: 'F', url: 'https://www.InfoMoney.com.br/mercados/abc/?utm=1#topo' }] });
    const b = n({ id: 'b', titulo: 'Y', fontes: [{ nome: 'G', url: 'http://infomoney.com.br/mercados/abc' }] });
    expect(motivoMesma(a, b)).toBe(3);
    expect(normalizarUrl('https://www.Site.com/a/b/?q=1#x')).toBe('site.com/a/b');
  });
  it('4: título parecido e mesma editoria funde; editoria diferente não', () => {
    const a = n({ id: 'a', titulo: 'Copom mantém a Selic em 13,75% ao ano', categoria: 'mercado' });
    const b = n({ id: 'b', titulo: 'Copom mantém Selic em 13,75% ao ano, diz BC', categoria: 'mercado' });
    expect(jaccard(palavrasTitulo(a.titulo), palavrasTitulo(b.titulo))).toBeGreaterThanOrEqual(LIMIAR_TITULO);
    expect(motivoMesma(a, b)).toBe(4);
    expect(mesmaNoticia(a, { ...b, categoria: 'mundo' })).toBe(false);
    expect(mesmaNoticia(a, { ...b, categoria: null, editoria: 'bancos_cooperativas' })).toBe(false);
  });
  it('4: editoria nova casa com a categoria legada equivalente da mesma notícia', () => {
    const legado = n({ id: 'a', titulo: 'Copom mantém a Selic em 13,75% ao ano', categoria: 'mercado' });
    const nova = n({ id: 'b', titulo: 'Copom mantém Selic em 13,75% ao ano, diz BC', editoria: 'mercados' });
    expect(motivoMesma(legado, nova)).toBe(4);
    const brasil = n({ id: 'c', titulo: 'Senado aprova PEC do teto de gastos', categoria: 'brasil' });
    const politica = n({ id: 'd', titulo: 'Senado aprova a PEC do teto de gastos em 2º turno', editoria: 'politica_regulacao' });
    expect(mesmaNoticia(brasil, politica)).toBe(true);
    expect(mesmaNoticia(brasil, { ...politica, editoria: 'economia' })).toBe(false);
  });
  it('4: sem editoria nem categoria, título parecido não basta', () => {
    expect(mesmaNoticia(n({ id: 'a', titulo: 'Copom mantém a Selic' }), n({ id: 'b', titulo: 'Copom mantém a Selic' }))).toBe(false);
  });
  it('títulos diferentes não fundem', () => {
    expect(
      mesmaNoticia(
        n({ id: 'a', titulo: 'Dólar sobe', categoria: 'mercado' }),
        n({ id: 'b', titulo: 'Soja cai em Chicago', categoria: 'mercado' }),
      ),
    ).toBe(false);
  });
  it('palavras: sem acento, sem stopwords, números mantidos', () => {
    expect([...palavrasTitulo('A Petrobras é a maior do Brasil em 2026')]).toEqual(['petrobras', 'maior', 'brasil', '2026']);
  });
});

describe('fusão das notícias do dia', () => {
  it('manhã e meio-dia, nas duas ordens, geram a mesma lista', () => {
    const a = fundirNoticias([rM, rT]);
    const b = fundirNoticias([rT, rM]);
    expect(b).toEqual(a);
  });
  it('notícia atualizada: versão mais recente, fontes unidas, selo e versão anterior', () => {
    const lista = fundirNoticias([rM, rT]);
    const up = lista.find((x) => x.item.id === 'conab-1-lev-2026-27')!;
    expect(up.status).toBe('atualizada');
    expect(up.horaSelo).toBe('12:20');
    expect(up.primeiraHora).toBe('07:15');
    expect((up.item as Noticia).resumo).toMatch(/^ATUALIZADO/);
    const urls = up.item.fontes.map((f) => f.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain('https://exemplo.com.br/atualizacao-meio-dia');
    expect(up.anteriores).toHaveLength(1);
    expect(up.anteriores[0]!.hora).toBe('07:15');
  });
  it('notícia nova entra com o horário dela', () => {
    const nova = fundirNoticias([rM, rT]).find((x) => x.item.id === 'exemplo-nova-1230')!;
    expect(nova.status).toBe('nova');
    expect(nova.horaSelo).toBe('12:05');
  });
  it('sem hora no item, usa a hora da edição; edições antigas sem gerado_em ficam às 07h15', () => {
    const semGerado = radarSchema.parse({ ...manha, edicao: { ...manha.edicao, gerado_em: null } });
    expect(fundirNoticias([semGerado])[0]!.hora).toBe('07:15');
  });
  it('destaques primeiro, mais recentes no topo; filtros', () => {
    const lista = fundirNoticias([rM, rT]);
    const primeiraNoticia = lista.findIndex((x) => x.tipo === 'noticia');
    expect(lista.slice(0, primeiraNoticia).every((x) => x.tipo === 'destaque')).toBe(true);
    expect(lista.slice(primeiraNoticia).every((x) => x.tipo === 'noticia')).toBe(true);
    expect(
      filtrarNoticias(lista, 'novas')
        .map((x) => x.status)
        .sort(),
    ).toEqual(['atualizada', 'nova']);
    expect(filtrarNoticias(lista, 'meio_dia')).toHaveLength(2);
    expect(filtrarNoticias(lista, 'manha').some((x) => x.item.id === 'exemplo-nova-1230')).toBe(false);
  });
});
