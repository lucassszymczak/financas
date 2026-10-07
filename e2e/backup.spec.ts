import { test, expect } from '@playwright/test';

test.describe('backup e uso sem internet', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'download e service worker testados no computador');
  });

  test('backup baixado é restaurado em outro aparelho', async ({ page, browser }) => {
    await page.goto('./');
    await page.getByRole('textbox', { name: 'Por texto' }).fill('gastei 55 no mercado');
    await page.getByRole('button', { name: 'Interpretar' }).click();
    await page.getByRole('button', { name: /Confirmar 1 item/ }).click();
    await expect(page.getByText('Você ainda não fez backup.')).toBeVisible();

    await page.getByRole('link', { name: 'Ajustes' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar backup' }).click();
    const d = await download;
    expect(d.suggestedFilename()).toMatch(/^plano-backup-\d{4}-\d{2}-\d{2}\.zip$/);
    await expect(page.getByText('Você ainda não fez backup.')).toBeHidden();
    const caminho = await d.path();

    const outro = await browser.newContext();
    const p2 = await outro.newPage();
    await p2.goto('./#/config');
    await p2.getByLabel('Escolher arquivo de backup').setInputFiles(caminho);
    await expect(p2.getByText(/1 lançamentos em 1 meses/)).toBeVisible();
    await p2.getByRole('button', { name: 'Mesclar' }).click();
    await expect(p2.getByText('Backup restaurado')).toBeVisible();
    await p2.getByRole('link', { name: 'Mês' }).click();
    await expect(p2.getByText('R$ 55,00').first()).toBeVisible();
    await outro.close();
  });

  test('abre sem internet depois da primeira visita', async ({ page, context }) => {
    await page.goto('./');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Capturar' })).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Capturar' })).toBeVisible();
    await context.setOffline(false);
  });
});
