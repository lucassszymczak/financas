import { test, expect } from '@playwright/test';

test('abre na tela Capturar e navega pelas abas', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Capturar' })).toBeVisible();
  await page.getByRole('link', { name: 'Mês' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mês' })).toBeVisible();
  await page.getByRole('link', { name: 'Ajustes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Configuração/ })).toBeVisible();
});
