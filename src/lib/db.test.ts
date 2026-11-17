import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import manha from '../../public/exemplos/radar_2026-10-21.json';
import meioDia from '../../public/exemplos/radar_2026-10-21_1230.json';
import * as db from './db';
import { lerBackup, montarBackup } from './importar';
import { CONFIG_PADRAO } from './config';

describe('migração do banco local (v1 → v2)', () => {
  it('edições antigas viram data#manha, sem perder nenhuma; apagadas também migram', async () => {
    const v1 = await openDB('radar-investimentos', 1, {
      upgrade(d) {
        d.createObjectStore('edicoes', { keyPath: 'data' });
        d.createObjectStore('config');
      },
    });
    await v1.put('edicoes', { data: '2026-10-16', bruto: { edicao: { data: '2026-10-16' } }, importadoEm: 'T1' });
    await v1.put('edicoes', { data: '2026-10-17', bruto: { edicao: { data: '2026-10-17' } }, importadoEm: 'T2' });
    await v1.put('config', { '2026-10-10': 'T0' }, 'apagadas');
    v1.close();

    db._resetarConexao();
    const lista = await db.listarEdicoes();
    expect(lista.map((e) => e.chave).sort()).toEqual(['2026-10-16#manha', '2026-10-17#manha']);
    expect(lista.find((e) => e.chave === '2026-10-16#manha')).toMatchObject({ data: '2026-10-16', importadoEm: 'T1' });
    expect(await db.lerApagadas()).toEqual({ '2026-10-10#manha': 'T0' });

    // Manhã e meio-dia do mesmo dia convivem.
    await db.salvarEdicao({ chave: '2026-10-21#manha', data: '2026-10-21', bruto: manha, importadoEm: 'T3' });
    await db.salvarEdicao({ chave: '2026-10-21#atualizacao_meio_dia', data: '2026-10-21', bruto: meioDia, importadoEm: 'T4' });
    expect((await db.listarEdicoes()).filter((e) => e.data === '2026-10-21')).toHaveLength(2);
    expect(await db.existeEdicao('2026-10-21#manha')).toBe(true);
  });
});

describe('backup', () => {
  it('formato novo guarda a chave; o antigo (só data) continua sendo aceito', () => {
    const novo = montarBackup(
      [
        { chave: '2026-10-21#atualizacao_meio_dia', data: '2026-10-21', bruto: meioDia, importadoEm: 'T2' },
        { chave: '2026-10-21#manha', data: '2026-10-21', bruto: manha, importadoEm: 'T1' },
      ],
      CONFIG_PADRAO,
    );
    expect(novo.versao).toBe(2);
    const lido = lerBackup(JSON.stringify(novo));
    expect(lido.ok && lido.backup.edicoes.map((e) => e.chave)).toEqual(['2026-10-21#atualizacao_meio_dia', '2026-10-21#manha']);
    const antigo = {
      app: 'radar-investimentos',
      versao: 1,
      config: CONFIG_PADRAO,
      edicoes: [{ data: '2026-10-21', bruto: manha, importadoEm: 'T1' }],
    };
    const lidoAntigo = lerBackup(JSON.stringify(antigo));
    expect(lidoAntigo.ok && lidoAntigo.backup.edicoes[0]!.chave).toBe('2026-10-21#manha');
  });
});
