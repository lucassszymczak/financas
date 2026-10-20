import { describe, expect, it } from 'vitest';
import exemplo from '../schema/exemplo.json';
import { radarSchema } from '../schema/radar';
import { LIMITES_PADRAO } from './config';
import { calcularAlertas } from './alertas';
import { serie } from './precos';

const radar = radarSchema.parse(exemplo);

describe('alertas', () => {
  it('no exemplo: limites de dólar e DI não disparam; boi Cepea acima de 370 também não', () => {
    const a = calcularAlertas(radar, LIMITES_PADRAO);
    expect(a.filter((x) => x.origem === 'limite')).toEqual([]);
  });
  it('dispara limite quando o valor cruza', () => {
    const a = calcularAlertas(radar, [{ id: 'USDBRL', tipo: 'acima', valor: 5, ativo: true }]);
    expect(a.find((x) => x.origem === 'limite')?.titulo).toBe('Dólar comercial acima de 5,00');
  });
  it('ignora limite desativado', () => {
    const a = calcularAlertas(radar, [{ id: 'USDBRL', tipo: 'acima', valor: 5, ativo: false }]);
    expect(a.some((x) => x.origem === 'limite')).toBe(false);
  });
  it('alertas de clima viram alertas', () => {
    const a = calcularAlertas(radar, []);
    const c = a.find((x) => x.origem === 'clima');
    expect(c?.nivel).toBe('atencao');
    expect(c?.titulo).toBe('Guarapuava (PR): frio (17/10 a 20/10)');
  });
  it('resume dados antigos (milho CBOT, milho Cepea e açúcar de 14/10)', () => {
    const a = calcularAlertas(radar, []).find((x) => x.origem === 'antigo');
    expect(a?.titulo).toBe('3 cotações com dado antigo');
    expect(a?.texto).not.toMatch(/Etanol/);
  });
});

describe('série histórica', () => {
  it('junta edições pela data de referência', () => {
    const outra = structuredClone(radar);
    outra.edicao.data = '2026-10-19';
    outra.cotacoes[0]!.data_ref = '2026-10-16';
    outra.cotacoes[0]!.valor = 205000;
    expect(serie([outra, radar], 'IBOV').map(({ x, y }) => ({ x, y }))).toEqual([
      { x: '2026-10-15', y: 204324.26 },
      { x: '2026-10-16', y: 205000 },
    ]);
  });
  it('ignora valores nulos', () => {
    expect(serie([radar], 'PETR4')).toEqual([]);
  });
});
