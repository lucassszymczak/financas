import { test, expect } from '@playwright/test';

const LEGADO = {
  config: {
    fixos: [{ tipo: 'saida', cat: 'Moradia', desc: 'Aluguel', valor: 1500 }],
    debts: { consig: { nome: 'Consignado', saldo: 1000, taxa: 2, parcela: 100 } },
    reserva: 5000,
    capital: 100,
  },
  months: {
    '2026-09': [
      { tipo: 'saida', cat: 'Saúde', desc: 'Consulta', valor: 300, data: '2026-09-12', dedutivel: 'saude', assetId: 'x' },
    ],
  },
  fech: {},
};

test('importa o JSON do app anterior com resumo e sem duplicar', async ({ page }) => {
  await page.goto('./#/config');
  const arquivo = { name: 'antigo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(LEGADO)) };
  for (let i = 0; i < 2; i++) {
    await page.getByLabel('Escolher JSON do app anterior').setInputFiles(arquivo);
    await expect(page.getByText('Resumo antes de gravar')).toBeVisible();
    await expect(page.getByText('1 com comprovante a anexar', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Importar', exact: true }).click();
    await expect(page.getByText('1 lançamentos importados')).toBeVisible();
  }
  await page.getByRole('link', { name: 'IR' }).click();
  await page.getByRole('combobox', { name: 'Ano-calendário' }).selectOption('2026');
  await expect(page.getByText('1 dedutível sem comprovante.')).toBeVisible();
});
