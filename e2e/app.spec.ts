import { expect, test, type Page } from '@playwright/test';

const ABAS = ['hoje', 'mercado', 'agro', 'clima', 'agenda', 'calculadoras', 'historico', 'config'];

async function semRolagemHorizontal(page: Page) {
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sobra).toBeLessThanOrEqual(0);
}

async function carregarExemplo(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Radar de Investimentos' })).toBeVisible();
  await page.getByRole('button', { name: /Ver exemplo/ }).click();
  await expect(page.getByText('Datafolha: empate técnico')).toBeVisible();
}

test('boas-vindas, exemplo e tela Hoje', async ({ page }) => {
  await carregarExemplo(page);
  await expect(page.getByText('🌡️ Termômetro')).toBeVisible();
  await expect(page.getByLabel('Indicadores principais').getByText('Dólar comercial')).toBeVisible();
  await expect(page.getByText('3 cotações com dado antigo')).toBeVisible();
  await expect(page.getByText('Guarapuava (PR): frio (17/10 a 20/10)')).toBeVisible();

  // Notícia abre em pop-up com fundo desfocado
  await page.getByRole('button', { name: /Datafolha: empate técnico/ }).click();
  const popup = page.getByRole('dialog');
  await expect(popup).toBeVisible();
  await expect(popup.getByRole('heading', { name: 'Por que aconteceu' })).toBeVisible();
  await expect(popup.getByRole('link', { name: 'InfoMoney' })).toBeVisible();
  const desfoque = await page.locator('.modal-fundo').evaluate((e) => getComputedStyle(e).backdropFilter);
  expect(desfoque).toContain('blur');
  await semRolagemHorizontal(page);
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await page.getByRole('button', { name: /Datafolha: empate técnico/ }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('todas as abas abrem sem rolagem horizontal', async ({ page }) => {
  await carregarExemplo(page);
  for (const aba of ABAS) {
    await page.goto(`./#/${aba}`);
    await expect(page.locator('main')).not.toBeEmpty();
    await semRolagemHorizontal(page);
  }
});

test('várias edições: limites, sparkline, histórico e modo leitura', async ({ page }) => {
  await carregarExemplo(page);
  await page
    .getByTestId('input-arquivo')
    .first()
    .setInputFiles(['e2e/fixtures/radar_2026-10-19.json', 'e2e/fixtures/radar_2026-10-20.json']);
  await expect(page.getByText('2 edições carregadas.')).toBeVisible();
  // O arquivo de 20/10 tem dólar acima de 5,10 e DI jan/29 acima de 12,75.
  await expect(page.getByText('Dólar comercial acima de 5,10')).toBeVisible();
  await expect(page.locator('.kpi-limite')).toHaveCount(2);

  await page.goto('./#/historico');
  await expect(page.getByText('Edições salvas (3)')).toBeVisible();
  await expect(page.locator('.grafico canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir' }).last().click();
  await expect(page.getByText('modo leitura')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar para a mais recente' }).click();
  await expect(page.getByText('modo leitura')).toHaveCount(0);
});

test('arquivo inválido mostra o campo com problema', async ({ page }) => {
  await carregarExemplo(page);
  await page.getByTestId('input-arquivo').first().setInputFiles('e2e/fixtures/radar_invalido.json');
  await expect(page.getByRole('dialog')).toContainText('edicao.data: campo obrigatório ausente');
  await expect(page.getByRole('dialog')).toContainText('cotacoes[2].valor: esperado número, veio texto');
});

test('edição repetida pergunta antes de substituir', async ({ page }) => {
  await carregarExemplo(page);
  await page.getByTestId('input-arquivo').first().setInputFiles('docs/radar_2026-10-16.json');
  await expect(page.getByRole('dialog')).toContainText('Já existe uma edição de 16/10/2026');
  await page.getByRole('button', { name: 'Manter a atual' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('mercado: lista limpa, preço, grupos recolhíveis e mapa de calor', async ({ page }) => {
  await carregarExemplo(page);
  await page.goto('./#/mercado');
  await expect(page.getByText(/ações sem preço no arquivo de hoje/)).toBeVisible();
  // Grupo com dado vem aberto; o resumo mostra quedas e ausentes.
  const blue = page.getByRole('button', { name: /Blue chips/ });
  await expect(blue).toHaveAttribute('aria-expanded', 'true');
  await expect(blue).toContainText('▼ 4');
  await expect(page.getByRole('button', { name: 'Petrobras PN: ver detalhes' })).toContainText('sem preço');
  await blue.click();
  await expect(blue).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Petrobras PN: ver detalhes' })).toHaveCount(0);
  // Itens ausentes ficam numa linha só.
  await expect(page.getByText('+ 4 sem dado hoje')).toBeVisible();
  await semRolagemHorizontal(page);

  // Mapa de calor
  await page.getByRole('button', { name: '▦ Mapa' }).click();
  await expect(page.locator('.bloco.mapa-b2').first()).toBeVisible();
  await semRolagemHorizontal(page);

  // Com preço no arquivo
  await page.getByTestId('input-arquivo').first().setInputFiles('e2e/fixtures/radar_2026-10-20.json');
  await expect(page.getByText('Edição de 20/10/2026 carregada.')).toBeVisible();
  await page.goto('./#/mercado');
  await page.getByRole('button', { name: '☰ Lista' }).click();
  await page.getByRole('button', { name: /Blue chips/ }).click();
  await expect(page.getByRole('button', { name: 'Petrobras PN: ver detalhes' })).toContainText('30,12');
});

test('detalhe do ativo pelo ticker: gráfico, estatísticas e notícias', async ({ page }) => {
  await carregarExemplo(page);
  await page
    .getByTestId('input-arquivo')
    .first()
    .setInputFiles(['e2e/fixtures/radar_2026-10-19.json', 'e2e/fixtures/radar_2026-10-20.json']);
  await expect(page.getByText('2 edições carregadas.')).toBeVisible();
  // O ticker está sempre rolando: focar o item pausa a animação; Enter abre o detalhe.
  await page.locator('.ticker-item').first().focus();
  await page.keyboard.press('Enter');
  const det = page.getByRole('dialog');
  await expect(det.getByRole('heading', { name: 'Ibovespa' })).toBeVisible();
  await expect(det.locator('.grafico canvas')).toBeVisible();
  await expect(det.getByText('Mínimo · máximo')).toBeVisible();
  await expect(det.getByText('Edições com dado')).toBeVisible();
  await expect(det.getByText('No Radar de hoje')).toBeVisible();
  await expect(det.getByText('Datafolha: empate técnico')).toBeVisible();
  await det.getByRole('button', { name: '7d' }).click();
  await expect(det.locator('.grafico canvas')).toBeVisible();
  await semRolagemHorizontal(page);
});

test('calculadora CDB x LCA', async ({ page }) => {
  await carregarExemplo(page);
  await page.goto('./#/calculadoras');
  // CDI vem null no exemplo: campo vazio com aviso.
  await expect(page.getByText('CDI não verificado nesta edição')).toBeVisible();
  await page.getByLabel('CDI anual').fill('15');
  await expect(page.getByText(/equivale a um CDB de 107,7% do CDI/)).toBeVisible();
});

test('backup: exportar e restaurar', async ({ page }) => {
  await carregarExemplo(page);
  await page.goto('./#/config');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exportar backup/ }).click();
  const arquivo = await (await download).path();

  await page.getByRole('button', { name: 'Apagar todas as edições' }).click();
  await page.getByRole('button', { name: 'Apagar tudo' }).click();
  await expect(page.getByText('0 edições salvas')).toBeVisible();

  await page.getByTestId('input-backup').setInputFiles(arquivo);
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(page.getByText('1 edição salva')).toBeVisible();
});

test('alterna o tema', async ({ page }) => {
  await carregarExemplo(page);
  const antes = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByRole('button', { name: /Mudar para tema/ }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).not.toBe(antes);
});

test('funciona sem internet depois de aberto (service worker)', async ({ page, context }) => {
  await carregarExemplo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByText('Datafolha: empate técnico')).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Datafolha: empate técnico')).toBeVisible();
  await context.setOffline(false);
});
