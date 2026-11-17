import { describe, expect, it } from 'vitest';
import { VALIDADE_MS, abrirCodigo, criarCodigo, extrairCodigo, gerarSenha, linkPareamento } from './pareamento';

const dados = { token: 'ghp_exemploExemploExemplo1234567890', gistId: 'abc123def456' };

describe('código para conectar outro aparelho', () => {
  it('senha tem sempre 6 dígitos', () => {
    for (let i = 0; i < 50; i++) expect(gerarSenha()).toMatch(/^\d{6}$/);
  });
  it('abre com a senha certa e não expõe a chave no texto', async () => {
    const codigo = await criarCodigo(dados, '042137');
    expect(codigo.startsWith('RADAR1.')).toBe(true);
    expect(codigo).not.toContain('ghp_');
    expect(await abrirCodigo(codigo, '042137')).toEqual(dados);
  });
  it('recusa senha errada, código cortado e código vencido', async () => {
    const agora = Date.now();
    const codigo = await criarCodigo(dados, '111111', agora);
    await expect(abrirCodigo(codigo, '111112')).rejects.toThrow(/Senha errada/);
    await expect(abrirCodigo(codigo.slice(0, 30), '111111')).rejects.toThrow(/incompleto|Senha errada/);
    await expect(abrirCodigo('qualquer coisa', '111111')).rejects.toThrow(/RADAR1/);
    await expect(abrirCodigo(codigo, '11a')).rejects.toThrow(/6 números/);
    await expect(abrirCodigo(codigo, '111111', agora + VALIDADE_MS + 1)).rejects.toThrow(/expirou/);
  });
  it('aceita o link inteiro ou o código com espaços e quebras de linha', async () => {
    const codigo = await criarCodigo(dados, '000777');
    const link = linkPareamento(codigo, 'https://exemplo.github.io/financas/');
    expect(link).toBe(`https://exemplo.github.io/financas/#/config/parear/${codigo}`);
    expect(extrairCodigo(link)).toBe(codigo);
    expect(await abrirCodigo(`  ${codigo.slice(0, 20)}\n${codigo.slice(20)} `, '000777')).toEqual(dados);
  });
});
