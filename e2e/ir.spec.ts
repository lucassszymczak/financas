import { test, expect } from '@playwright/test';

test('dedutível sem foto fica pendente, recebe anexo e exporta CSV', async ({ page, browser }) => {
  const g = await browser.newPage({ viewport: { width: 200, height: 200 } });
  await g.setContent('<body style="background:#fff;font-size:30px">RECIBO</body>');
  const png = await g.screenshot();
  await g.close();

  await page.goto('./');
  await page.getByRole('textbox', { name: 'Por texto' }).fill('paguei 350,50 na clinica sorriso');
  await page.getByRole('button', { name: 'Interpretar' }).click();
  await expect(page.getByText('Dedutível', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Confirmar 1 item/ }).click();

  await page.getByRole('link', { name: 'IR' }).click();
  await expect(page.getByText('R$ 350,50').first()).toBeVisible();
  await expect(page.getByText('1 dedutível sem comprovante.')).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Anexar' }).click();
  await (await chooser).setFiles({ name: 'r.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Comprovante anexado')).toBeVisible();
  await expect(page.getByText('1 dedutível sem comprovante.')).toBeHidden();
  await page.getByRole('button', { name: 'Ver' }).click();
  await expect(page.getByRole('img', { name: 'Comprovante' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();

  if (test.info().project.name === 'desktop') {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV de dedutíveis' }).click();
    const d = await download;
    expect(d.suggestedFilename()).toMatch(/^dedutiveis-\d{4}\.csv$/);
    const conteudo = await (await import('node:fs')).promises.readFile(await d.path(), 'utf8');
    expect(conteudo).toContain('350,50');
    expect(conteudo).toContain('Saúde');
  }
});
