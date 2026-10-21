import { describe, expect, it } from 'vitest';
import { CONFIG_PADRAO } from './config';
import { clienteGist, lerPacote, mesclar, montarPacote, type Lado } from './sync';

const ed = (data: string, importadoEm: string) => ({ chave: `${data}#manha`, data, importadoEm, bruto: { data } });
const lado = (p: Partial<Lado> = {}): Lado => ({ config: CONFIG_PADRAO, edicoes: [], apagadas: {}, ...p });

describe('mescla da sincronização', () => {
  it('junta edições dos dois aparelhos', () => {
    const r = mesclar(lado({ edicoes: [ed('2026-10-16', 'T1')] }), lado({ edicoes: [ed('2026-10-19', 'T2')] }));
    expect(r.resultado.edicoes.map((e) => e.data)).toEqual(['2026-10-16', '2026-10-19']);
    expect(r.mudouLocal).toBe(true);
    expect(r.mudouRemoto).toBe(true);
  });

  it('na mesma data, fica a importada por último', () => {
    const r = mesclar(
      lado({ edicoes: [ed('2026-10-16', '2026-10-16T10:00')] }),
      lado({ edicoes: [ed('2026-10-16', '2026-10-16T12:00')] }),
    );
    expect(r.resultado.edicoes[0]!.importadoEm).toBe('2026-10-16T12:00');
    expect(r.mudouLocal).toBe(true);
    expect(r.mudouRemoto).toBe(false);
  });

  it('edição apagada em um aparelho some do outro', () => {
    const r = mesclar(
      lado({ edicoes: [], apagadas: { '2026-10-16#manha': '2026-10-17T09:00' } }),
      lado({ edicoes: [ed('2026-10-16', '2026-10-16T08:00')] }),
    );
    expect(r.resultado.edicoes).toEqual([]);
    expect(r.resultado.apagadas['2026-10-16#manha']).toBe('2026-10-17T09:00');
    expect(r.mudouRemoto).toBe(true);
  });

  it('reimportar depois de apagar traz a edição de volta', () => {
    const r = mesclar(
      lado({ edicoes: [ed('2026-10-16', '2026-10-18T09:00')] }),
      lado({ apagadas: { '2026-10-16#manha': '2026-10-17T09:00' } }),
    );
    expect(r.resultado.edicoes).toHaveLength(1);
    expect(r.resultado.apagadas).toEqual({});
  });

  it('configuração alterada por último vence', () => {
    const local = lado({ config: { ...CONFIG_PADRAO, nomeApp: 'Celular', atualizadaEm: '2026-10-16T10:00' } });
    const remoto = lado({ config: { ...CONFIG_PADRAO, nomeApp: 'PC', atualizadaEm: '2026-10-16T11:00' } });
    expect(mesclar(local, remoto).resultado.config.nomeApp).toBe('PC');
    expect(mesclar(remoto, local).resultado.config.nomeApp).toBe('PC');
  });

  it('lados iguais não mudam nada', () => {
    const l = lado({ edicoes: [ed('2026-10-16', 'T1')] });
    const r = mesclar(l, structuredClone(l));
    expect(r.mudouLocal).toBe(false);
    expect(r.mudouRemoto).toBe(false);
  });

  it('pacote vai e volta', () => {
    const l = lado({ edicoes: [ed('2026-10-16', 'T1')], apagadas: { '2026-10-01#manha': 'T0' } });
    expect(lerPacote(JSON.stringify(montarPacote(l)))).toEqual(l);
    expect(() => lerPacote('{"x":1}')).toThrow(/corrompido/);
  });
});

describe('cliente do Gist', () => {
  it('traduz chave recusada para português', async () => {
    const f = (async () => new Response('{}', { status: 401 })) as typeof fetch;
    await expect(clienteGist('x', f).encontrar()).rejects.toThrow(/não aceitou a chave/);
  });
  it('sem internet', async () => {
    const f = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    await expect(clienteGist('x', f).encontrar()).rejects.toThrow(/Sem conexão/);
  });
  it('cria e grava no arquivo certo', async () => {
    const pedidos: { url: string; init?: RequestInit }[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      pedidos.push({ url, init });
      return new Response(JSON.stringify({ id: 'abc', files: {} }), { status: 200 });
    }) as unknown as typeof fetch;
    const c = clienteGist('tok', f);
    expect(await c.criar('{}')).toBe('abc');
    await c.gravar('abc', '{"a":1}');
    expect(pedidos[0]!.url).toBe('https://api.github.com/gists');
    expect(JSON.parse(String(pedidos[0]!.init!.body)).public).toBe(false);
    expect(pedidos[1]!.init!.method).toBe('PATCH');
    expect((pedidos[1]!.init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });
});
