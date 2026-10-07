import { test, expect } from '@playwright/test';

test('lança gasto por texto passando pela revisão', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Por texto' }).fill('gastei 87 no posto hoje\nrecebi 400 do show');
  await page.getByRole('button', { name: 'Interpretar' }).click();
  await expect(page.getByRole('heading', { name: /Revisão \(2 de 2\)/ })).toBeVisible();
  await expect(page.getByText(/Combustível/)).toBeVisible();
  await page.getByRole('button', { name: /Confirmar 2 itens/ }).click();
  await expect(page.getByText('2 lançamentos salvos')).toBeVisible();
});

test('lançamento manual', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Lançamento manual' }).click();
  await page.getByLabel('Valor').fill('12,34');
  await page.getByLabel('Estabelecimento').fill('Farmácia Teste');
  await page.getByRole('button', { name: /Confirmar 1 item/ }).click();
  await expect(page.getByText('1 lançamento salvo')).toBeVisible();
});

test('resultado aparece na tela Mês e reembolso pode ser marcado', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Por texto' }).fill('recebi 1000 do show\ngastei 300 no mercado\n200 hotel');
  await page.getByRole('button', { name: 'Interpretar' }).click();
  await page.getByRole('button', { name: /Confirmar 3 itens/ }).click();
  await page.getByRole('link', { name: 'Mês' }).click();
  await expect(page.getByText('+R$ 700,00').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reembolsos pendentes' })).toBeVisible();
  await page.getByRole('button', { name: 'Recebido' }).click();
  await expect(page.getByRole('heading', { name: 'Reembolsos pendentes' })).toBeHidden();
});
