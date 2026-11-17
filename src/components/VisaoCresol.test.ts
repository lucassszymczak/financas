import { describe, expect, it } from 'vitest';
import base from '../../e2e/fixtures/radar_2026-10-20.json';
import visao from '../../e2e/fixtures/visao_cresol.json';
import { radarSchema } from '../schema/radar';
import { fundirDia } from '../lib/fusao';
import { tabelaProjecoes, valorProjecao, visaoMaisRecente } from './VisaoCresol';

const comVisao = (data: string, v: unknown) => radarSchema.parse({ ...base, edicao: { ...base.edicao, data }, visao_cresol: v });

describe('Visão Cresol', () => {
  it('o schema aceita o campo e as edições sem ele continuam válidas', () => {
    const r = comVisao('2026-11-17', visao);
    expect(r.visao_cresol?.projecoes).toHaveLength(8);
    expect(r.visao_cresol?.pontos.map((p) => p.tema)).toContain('Crédito');
    expect(radarSchema.parse(base).visao_cresol).toBeUndefined();
  });
  it('formata os valores na unidade de cada indicador', () => {
    expect(valorProjecao(5.1, '%')).toBe('5,10%');
    expect(valorProjecao(13.75, '% a.a.')).toBe('13,75% a.a.');
    expect(valorProjecao(5.5, 'R$/US$')).toBe('R$ 5,50');
    expect(valorProjecao(null, '%')).toBe('—');
  });
  it('monta a tabela com um indicador por linha e os anos nas colunas', () => {
    const t = tabelaProjecoes(comVisao('2026-11-17', visao).visao_cresol!.projecoes);
    expect(t.anos).toEqual([2026, 2027]);
    expect(t.linhas.map((l) => l.indicador)).toEqual(['IPCA', 'Selic (fim de ano)', 'PIB', 'Câmbio (fim de ano)']);
    expect(t.linhas[1]!.porAno.map((p) => p?.valor)).toEqual([13.75, 12.75]);
  });
  it('vale a análise mais recente até a data aberta, mesmo que as edições seguintes não a repitam', () => {
    const outubro = { ...visao, titulo: 'Outubro', data_base: '2026-10-10' };
    const eds = [
      { data: '2026-10-12', radar: comVisao('2026-10-12', outubro) },
      { data: '2026-11-17', radar: comVisao('2026-11-17', visao) },
      { data: '2026-11-18', radar: comVisao('2026-11-18', null) },
    ];
    expect(visaoMaisRecente(eds, '2026-11-18')?.titulo).toBe(visao.titulo);
    expect(visaoMaisRecente(eds, '2026-10-31')?.titulo).toBe('Outubro');
    expect(visaoMaisRecente(eds, '2026-10-01')).toBeNull();
  });
  it('na fusão do dia, vale a Visão Cresol da edição mais recente que a trouxe', () => {
    const manha = comVisao('2026-11-17', visao);
    const meioDia = radarSchema.parse({
      ...base,
      edicao: { ...base.edicao, data: '2026-11-17', tipo: 'atualizacao_meio_dia', gerado_em: '2026-11-17T12:30:00-03:00' },
    });
    expect(fundirDia([manha, meioDia]).visao_cresol?.titulo).toBe(visao.titulo);
  });
});
