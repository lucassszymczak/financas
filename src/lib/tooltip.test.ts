import { describe, expect, it } from 'vitest';
import { dataDica, ehTaxa, indiceValido, proximoValido, textoVariacao, tituloDica, valorDica, variacaoDia, variacaoPeriodo } from './tooltip';

describe('dica dos gráficos', () => {
  it('data e valor no formato brasileiro', () => {
    expect(dataDica('2026-10-20')).toBe('ter, 20/10/2026');
    expect(tituloDica('2026-10-21', { hora: '12:24' })).toBe('qua, 21/10/2026 · intradiário 12h24');
    expect(valorDica(205079.12, 'pts')).toBe('205.079 pts');
    expect(valorDica(5.05, 'R$')).toBe('R$ 5,05');
    expect(valorDica(12.66, '% a.a.')).toBe('12,66% a.a.');
    expect(valorDica(109.55, 'US$/barril')).toBe('US$ 109,55/barril');
  });
  it('usa a variação do arquivo quando houver', () => {
    const pts = [
      { x: '2026-10-19', y: 100 },
      { x: '2026-10-20', y: 101, vp: 1.17 },
    ];
    expect(textoVariacao(variacaoDia(pts, 1, false))).toBe('▲ 1,17%');
  });
  it('sem variação no arquivo, calcula contra o ponto anterior e marca "(calculada)"', () => {
    const pts = [
      { x: '2026-10-19', y: 200 },
      { x: '2026-10-20', y: 198 },
    ];
    expect(textoVariacao(variacaoDia(pts, 1, false))).toBe('▼ 1,00% (calculada)');
    expect(variacaoDia(pts, 0, false)).toBeNull();
    expect(textoVariacao(variacaoDia([pts[0]!, { x: '2026-10-20', y: 200 }], 1, false))).toBe('estável (calculada)');
  });
  it('taxas em pontos-base', () => {
    const pts = [
      { x: '2026-10-19', y: 12.6 },
      { x: '2026-10-20', y: 12.66 },
    ];
    expect(ehTaxa('% a.a.')).toBe(true);
    expect(textoVariacao(variacaoDia(pts, 1, true))).toBe('▲ 6 pb (calculada)');
    expect(textoVariacao(variacaoDia([pts[0]!, { ...pts[1]!, vb: -3 }], 1, true))).toBe('▼ 3 pb');
    expect(textoVariacao(variacaoPeriodo(pts, 1, true))).toBe('▲ 6 pb');
  });
  it('pula dias sem dado', () => {
    const ys = [10, null, null, 13, null];
    expect(indiceValido(ys, 1)).toBe(0);
    expect(indiceValido(ys, 2)).toBe(3);
    expect(indiceValido(ys, 4)).toBe(3);
    expect(proximoValido(ys, 0, 1)).toBe(3);
    expect(proximoValido(ys, 3, 1)).toBe(3);
    expect(proximoValido(ys, 3, -1)).toBe(0);
  });
});
