import { test, expect } from '@playwright/test';

test('cria teto e salva o fechamento do mês', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Por texto' }).fill('gastei 300 no restaurante');
  await page.getByRole('button', { name: 'Interpretar' }).click();
  await page.getByRole('button', { name: /Confirmar 1 item/ }).click();

  await page.getByRole('link', { name: 'Controle' }).click();
  await page.getByRole('button', { name: '+ Teto' }).click();
  await page.getByRole('combobox', { name: 'Categoria' }).selectOption('Restaurante');
  await page.getByRole('textbox', { name: 'Teto mensal' }).fill('200');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('estourou')).toBeVisible();

  const opcoes = page.getByRole('combobox', { name: 'Mês' });
  await opcoes.selectOption({ index: 0 });
  await page.getByRole('button', { name: 'Gerar fechamento' }).click();
  await expect(page.getByRole('textbox', { name: 'Texto do fechamento' })).toHaveValue(/Restaurante estourou o teto/);
  await page.getByRole('button', { name: 'Salvar fechamento' }).click();
  await expect(page.getByText('Fechamento salvo')).toBeVisible();
  await expect(page.getByText(/Mês fechado/)).toBeVisible();
});
