import { describe, expect, it } from 'vitest';
import exemplo from '../../../docs/radar_2026-10-16.json';
import { radarSchema, type Radar } from '../../schema/radar';
import { buscarCotacao, PROCURA_ARROBA, PROCURA_DOLAR, procuraBushel, procuraSaca, radaresAte } from './cotacoes';

const r16 = radarSchema.parse(exemplo);
const copia = (data: string, mexer: (j: typeof exemplo) => void): Radar => {
  const j = structuredClone(exemplo);
  j.edicao.data = data;
  mexer(j);
  return radarSchema.parse(j);
};

describe('cotações das calculadoras', () => {
  it('acha dólar, arroba e as cotações de cada produto', () => {
    expect(buscarCotacao([r16], PROCURA_DOLAR)?.valor).toBe(5.087);
    expect(buscarCotacao([r16], PROCURA_ARROBA)?.valor).toBe(380.2);
    expect(buscarCotacao([r16], procuraBushel('soja'))?.valor).toBe(12.63);
    expect(buscarCotacao([r16], procuraBushel('milho'))?.valor).toBe(4.8075);
    expect(buscarCotacao([r16], procuraSaca('soja'))?.id).toBe('SOJA_PGUA');
    expect(buscarCotacao([r16], procuraSaca('milho'))?.valor).toBe(65.43);
    // Trigo: sem Chicago no arquivo; a saca vem da praça regional.
    expect(buscarCotacao([r16], procuraBushel('trigo'))).toBeNull();
    expect(buscarCotacao([r16], procuraSaca('trigo'))?.id).toBe('GPV_TRIGO');
  });
  it('sem o dado na edição aberta, usa a última edição anterior que trouxe', () => {
    const r17 = copia('2026-10-17', (j) => {
      j.cotacoes.find((c) => c.id === 'USDBRL')!.valor = null as unknown as number;
    });
    const c = buscarCotacao(radaresAte(r17, [r16, r17]), PROCURA_DOLAR);
    expect(c).toMatchObject({ valor: 5.087, edicao: '2026-10-16' });
    // Edições futuras à aberta não entram.
    expect(radaresAte(r16, [r16, r17]).map((r) => r.edicao.data)).toEqual(['2026-10-16']);
  });
  it('reconhece ids diferentes pelo nome e pela unidade', () => {
    const r = copia('2026-10-18', (j) => {
      const soja = j.agro.find((a) => a.id === 'SOJA_CBOT')!;
      soja.id = 'ZS_F27';
      const dolar = j.cotacoes.find((c) => c.id === 'USDBRL')!;
      dolar.id = 'DOLAR_COMERCIAL';
    });
    expect(buscarCotacao([r], procuraBushel('soja'))?.id).toBe('ZS_F27');
    expect(buscarCotacao([r], PROCURA_DOLAR)?.id).toBe('DOLAR_COMERCIAL');
  });
});
