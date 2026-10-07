import { test, expect } from '@playwright/test';

test('posso gastar separa fato de estimativa', async ({ page }) => {
  await page.goto('./#/respostas');
  await page.getByRole('textbox', { name: 'Valor do gasto' }).fill('100');
  await expect(page.getByText('Fato', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Estimativa', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Com esse gasto: −R\$ 100,00/)).toBeVisible();
});
