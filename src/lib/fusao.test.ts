import { describe, expect, it } from 'vitest';
import manha from '../../public/exemplos/radar_2026-10-21.json';
import meioDia from '../../public/exemplos/radar_2026-10-21_1230.json';
import { radarSchema } from '../schema/radar';
import { fundirDia } from './fusao';
import { chaveEdicao, chaveMigrada, compararEdicoes } from './edicoes';
import { ehIntradiario, mapaPrecos, serie } from './precos';
import { dadoAntigo } from './pregao';

const rM = radarSchema.parse(manha);
const rT = radarSchema.parse(meioDia);

describe('edições do dia', () => {
  it('chave data#tipo; sem tipo é manhã; tipo desconhecido leva o gerado_em', () => {
    expect(chaveEdicao(rM)).toBe('2026-10-21#manha');
    expect(chaveEdicao(rT)).toBe('2026-10-21#atualizacao_meio_dia');
    const outro = radarSchema.parse({ ...manha, edicao: { ...manha.edicao, tipo: 'extra' } });
    expect(chaveEdicao(outro)).toBe('2026-10-21#extra@2026-10-21T07:15:00-03:00');
    expect(chaveMigrada('2026-10-16')).toBe('2026-10-16#manha');
    expect([rT, rM].sort(compararEdicoes)).toEqual([rM, rT]);
  });
});

describe('fusão do dia', () => {
  it('a ordem de importação não muda o resultado', () => {
    expect(fundirDia([rT, rM])).toEqual(fundirDia([rM, rT]));
  });
  it('cotação da edição mais recente ganha; intradiário marcado', () => {
    const d = mapaPrecos(fundirDia([rM, rT])).get('USDBRL')!;
    expect(d.valor).toBe(5.12);
    expect(d.hora_ref).toBe('12:24');
    expect(d.observacao).toBe('intradiário');
  });
  it('null na edição nova não apaga o valor anterior (e diz de onde veio)', () => {
    const d = mapaPrecos(fundirDia([rM, rT])).get('BRENT')!;
    expect(d.valor).toBe(105.21);
    expect(d.herdado).toEqual({ edicao: 'Manhã', hora: '07:15' });
    expect(d.data_ref).toBe('2026-10-20');
  });
  it('itens só da manhã continuam aparecendo', () => {
    const f = fundirDia([rM, rT]);
    expect(mapaPrecos(f).get('SOJA_CBOT')?.valor).toBe(12.63);
    expect(f.agro.length).toBe(rM.agro.length);
  });
  it('textos da edição mais recente; limitações das duas', () => {
    const f = fundirDia([rM, rT]);
    expect(f.termometro?.texto).toMatch(/meio-dia/);
    expect(f.limitacoes.length).toBe(rM.limitacoes.length + rT.limitacoes.length);
  });
});

describe('histórico só com fechamentos', () => {
  it('séries ignoram valores intradiários', () => {
    const s = serie([rT, rM], 'USDBRL');
    expect(s.every((p) => p.y !== 5.12)).toBe(true);
    expect(s.at(-1)?.x).toBe('2026-10-20');
  });
  it('intradiário de outro dia é dado antigo; do próprio dia, não', () => {
    expect(dadoAntigo({ data_ref: '2026-10-21', hora_ref: '12:24' }, '2026-10-21')).toBe(false);
    expect(dadoAntigo({ data_ref: '2026-10-20', hora_ref: '12:24' }, '2026-10-21')).toBe(true);
    expect(dadoAntigo({ data_ref: '2026-10-20' }, '2026-10-21')).toBe(false);
  });
  it('detecta intradiário por hora_ref ou observação', () => {
    expect(ehIntradiario({ hora_ref: '12:20' })).toBe(true);
    expect(ehIntradiario({ observacao: 'Intradiário' })).toBe(true);
    expect(ehIntradiario({ observacao: 'fechamento' })).toBe(false);
  });
});
