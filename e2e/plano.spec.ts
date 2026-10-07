import { test, expect } from '@playwright/test';

function mesAnterior(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

test('configura, aplica parcelas e distribui um extraordinário', async ({ page }) => {
  await page.goto('./#/config');
  await page.getByRole('textbox', { name: 'Reserva', exact: true }).fill('10.000,00');
  await page.getByRole('textbox', { name: 'Salário base do Longevidade' }).fill('10000');
  await page.getByLabel('Último mês aplicado').fill(mesAnterior());
  await page.getByRole('button', { name: 'Salvar valores' }).click();

  await page.getByRole('button', { name: '+ Dívida' }).click();
  await page.getByRole('textbox', { name: 'Nome' }).fill('Consignado');
  await page.getByRole('combobox', { name: 'Papel no plano' }).selectOption('consignado');
  await page.getByRole('textbox', { name: 'Saldo devedor' }).fill('3000');
  await page.getByRole('textbox', { name: 'Parcela', exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();

  await page.getByRole('link', { name: 'Plano' }).click();
  await page.getByRole('button', { name: /Aplicar parcelas de/ }).click();
  await expect(page.getByRole('button', { name: 'Parcelas em dia' })).toBeVisible();
  await expect(page.getByText('R$ 2.000,00').first()).toBeVisible();
  await expect(page.getByText('R$ 400,00').first()).toBeVisible(); // capital: 2% + 2% de 10 mil

  await page.getByRole('link', { name: 'Capturar' }).click();
  await page.getByRole('button', { name: 'Lançamento manual' }).click();
  await page.getByRole('textbox', { name: 'Valor' }).fill('10000');
  await page.getByRole('combobox', { name: 'Tipo' }).selectOption('extra_in');
  await page.getByRole('combobox', { name: 'Categoria' }).selectOption('PLR');
  await page.getByRole('button', { name: /Confirmar 1 item/ }).click();

  await expect(page.getByRole('heading', { name: 'Destino dos extraordinários' })).toBeVisible();
  await page.getByRole('button', { name: 'Aplicar sugestão' }).click();
  await expect(page.getByRole('heading', { name: 'Destino dos extraordinários' })).toBeHidden();
  // 5.000 até o piso, 2.000 quita o consignado, 3.000 → 900 uso livre + 2.100 reserva
  await expect(page.getByText('R$ 17.100,00')).toBeVisible();
  await expect(page.getByText('Quitada.')).toBeVisible();
});
