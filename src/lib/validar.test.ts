import { describe, expect, it } from 'vitest';
import exemplo from '../schema/exemplo.json';
import { caminho, validarRadar, validarTexto } from './validar';

const copia = () => structuredClone(exemplo) as Record<string, unknown> & typeof exemplo;

describe('validação do JSON do Radar', () => {
  it('aceita o exemplo real', () => {
    const r = validarRadar(exemplo);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.radar.edicao.data).toBe('2026-10-16');
    expect(r.radar.cotacoes).toHaveLength(20);
    expect(r.radar.taxas_referencia?.selic_meta).toBeNull();
  });

  it('ignora campos desconhecidos sem quebrar', () => {
    const d = copia();
    d.campo_novo = { qualquer: 1 };
    (d.cotacoes[0] as Record<string, unknown>).volume = 123;
    const r = validarRadar(d);
    expect(r.ok).toBe(true);
    if (r.ok) expect('volume' in r.radar.cotacoes[0]!).toBe(false);
  });

  it('aceita null como "não verificado"', () => {
    const d = copia();
    (d.cotacoes[0] as Record<string, unknown>).valor = null;
    (d.cotacoes[0] as Record<string, unknown>).variacao_pct = null;
    expect(validarRadar(d).ok).toBe(true);
  });

  it('usa listas vazias quando seções opcionais faltam', () => {
    const r = validarRadar({ schema_version: '1.0', edicao: { data: '2026-10-19' } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.radar.cotacoes).toEqual([]);
      expect(r.radar.agenda).toEqual([]);
    }
  });

  it('aponta campo obrigatório ausente', () => {
    const d = copia();
    delete (d.edicao as Record<string, unknown>).data;
    const r = validarRadar(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros).toContain('edicao.data: campo obrigatório ausente');
  });

  it('aponta tipo errado com o caminho do item', () => {
    const d = copia();
    (d.cotacoes[3] as Record<string, unknown>).valor = '13,5';
    const r = validarRadar(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros).toContain('cotacoes[3].valor: esperado número, veio texto');
  });

  it('aponta data em formato inválido', () => {
    const d = copia();
    (d.agenda[0] as Record<string, unknown>).data = '16/10/2026';
    const r = validarRadar(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros[0]).toBe('agenda[0].data: data inválida (use AAAA-MM-DD) (veio "16/10/2026")');
  });

  it('aponta nota de fonte fora de 0 a 5', () => {
    const d = copia();
    (d.destaques[0]!.fontes[0] as Record<string, unknown>).nota = 7;
    const r = validarRadar(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros[0]).toMatch(/^destaques\[0\]\.fontes\[0\]\.nota: nota máxima é 5/);
  });

  it('rejeita lista no lugar de objeto', () => {
    const r = validarRadar([]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros[0]).toBe('(raiz do arquivo): esperado objeto, veio lista');
  });

  it('rejeita texto que não é JSON', () => {
    const r = validarTexto('{ "schema_version": ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros[0]).toMatch(/não é um JSON válido/);
  });

  it('monta caminhos legíveis', () => {
    expect(caminho(['clima', 'regioes', 0, 'previsao', 2, 'min'])).toBe('clima.regioes[0].previsao[2].min');
  });
});
