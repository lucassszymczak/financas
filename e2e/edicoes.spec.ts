import { expect, test } from '@playwright/test';

const MANHA = 'public/exemplos/radar_2026-10-21.json';
const MEIO_DIA = 'public/exemplos/radar_2026-10-21_1230.json';

test('duas edições no dia: fusão das notícias, intradiário, histórico e dica do gráfico', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Ver exemplo/ }).click();
  await expect(page.getByText('Datafolha: empate técnico')).toBeVisible();

  // Meio-dia antes da manhã: a ordem de importação não importa.
  await page.getByTestId('input-arquivo').first().setInputFiles([MEIO_DIA, MANHA]);
  await expect(page.getByText('2 edições carregadas.')).toBeVisible();
  await page.goto('./#/hoje');

  // Notícia atualizada e notícia nova, com selos e versão anterior.
  await expect(page.getByText('Atualizada às 12h20').first()).toBeVisible();
  await expect(page.getByText('Nova · 12h05').first()).toBeVisible();
  await page.getByRole('button', { name: 'Só novas/atualizadas' }).click();
  await expect(page.locator('.radar-editorias .item-compacto, .card-noticia')).toHaveCount(2);
  await page.getByRole('button', { name: 'Todas' }).click();

  // Cotação intradiária no KPI do dólar.
  await expect(page.locator('.kpi', { hasText: 'Dólar' }).getByText('intradiário · 12h24')).toBeVisible();

  // Dica do gráfico do ativo: hover e teclado.
  await page.locator('.kpi', { hasText: 'Dólar' }).click();
  const grafico = page.locator('.modal .grafico');
  await expect(grafico).toBeVisible();
  await grafico.focus();
  await page.keyboard.press('End');
  const dica = page.locator('.modal .dica-grafico');
  await expect(dica).toContainText('intradiário 12h24');
  await expect(dica).toContainText('R$ 5,12');
  await page.keyboard.press('ArrowLeft');
  await expect(dica).toContainText('R$');
  await expect(page.locator('.modal [aria-live="polite"]').last()).toContainText('Dólar');
  const caixa = (await page.locator('.modal .u-over').boundingBox())!;
  await page.mouse.move(caixa.x + 4, caixa.y + caixa.height / 2);
  await expect(dica).toBeVisible();
  const d = (await dica.boundingBox())!;
  const largura = page.viewportSize()!.width;
  expect(d.x).toBeGreaterThanOrEqual(0);
  expect(d.x + d.width).toBeLessThanOrEqual(largura);
  await page.keyboard.press('Escape');

  // Histórico: dia agrupado, com as duas edições e o dia completo.
  await page.goto('./#/historico');
  await expect(page.getByRole('button', { name: 'Dia completo' })).toBeVisible();
  await page.getByRole('button', { name: 'Manhã 07h15' }).click();
  await expect(page.locator('.selo', { hasText: 'Atualizada às' })).toHaveCount(0);
  await page.goto('./#/historico');
  await page.getByRole('button', { name: 'Meio-dia 12h30' }).click();
  await expect(page.locator('.selo', { hasText: 'Nova ·' })).toHaveCount(0);
});

test('logos e bandeiras: ícones ao lado dos ativos e opção para esconder', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Ver exemplo/ }).click();
  await expect(page.locator('.kpi', { hasText: 'Treasury 10 anos' }).locator('img.ativo-bandeira')).toHaveAttribute(
    'alt',
    'Estados Unidos',
  );
  await expect(page.locator('.kpi', { hasText: 'Ibovespa' }).locator('img.ativo-bandeira')).toHaveAttribute('alt', 'Brasil');
  // Logos das ações (PETR3/PETR4 → PETR.png; código novo EMBJ com o logo da Embraer).
  await page.goto('./#/mercado');
  await page.getByRole('button', { name: '☰ Lista' }).click();
  await expect(page.locator('img.ativo-logo[src$="logos/PETR.png"]').first()).toBeVisible();
  await expect(page.locator('img.ativo-logo[src$="logos/EMBJ.png"]').first()).toBeVisible();
  // Nenhuma imagem quebrada.
  const quebradas = await page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLImageElement>('img.ativo-icone')].filter((i) => i.complete && i.naturalWidth === 0)
        .length,
  );
  expect(quebradas).toBe(0);
  await page.goto('./#/config');
  await page.getByLabel('Mostrar logos e bandeiras').uncheck();
  await page.goto('./#/hoje');
  await expect(page.locator('.ativo-icone')).toHaveCount(0);
});

test('FIIs por tipo: cartões, tabela do tipo e coluna Tipo', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Ver exemplo/ }).click();
  await page.getByTestId('input-arquivo').first().setInputFiles('e2e/fixtures/radar_2026-10-20.json');
  await expect(page.getByText('Edição de 20/10/2026 (manhã) carregada.')).toBeVisible();
  await page.goto('./#/mercado/fiis');
  await expect(page.getByRole('heading', { name: /Todos os FIIs/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Tipo' })).toBeVisible();
  await page.locator('a.setor', { hasText: 'Recebíveis (papel)' }).click();
  await expect(page.getByRole('heading', { name: 'Recebíveis (papel)', level: 2 })).toBeVisible();
  await expect(page.locator('.painel-setor').getByText('MXRF11')).toBeVisible();
  await page.getByRole('link', { name: 'Ver todos os FIIs' }).click();
  await expect(page.getByRole('heading', { name: /Todos os FIIs/ })).toBeVisible();
});

test('notícias por editoria: menu, página da editoria, estado vazio e blocos na tela Hoje', async ({ page, isMobile }) => {
  await page.goto('./');
  await page.getByTestId('input-arquivo').first().setInputFiles('public/exemplos/radar_exemplo_editorias.json');
  await expect(page.getByText('Edição de exemplo: notícias e números fictícios')).toBeVisible();

  // Hoje: destaques e "Radar por editoria" com o link para a página da editoria.
  await expect(page.getByRole('heading', { name: 'Radar por editoria' })).toBeVisible();
  await expect(page.getByText(/Tecnologia, IA e energia · sem destaques relevantes hoje/)).toBeVisible();
  await page.locator('.bloco-editoria-todas[href="#/noticias/bancos_cooperativas"]').click();
  await expect(page.getByRole('heading', { name: /Bancos e cooperativas/, level: 1 })).toBeVisible();
  await expect(page.locator('.card-completo')).toHaveCount(3);

  // Menu: "Notícias" com a contagem por editoria (no celular, dentro do menu ☰).
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.getByRole('button', { name: 'Notícias' }).click();
  const sub = page.locator('#submenu-noticias');
  await expect(sub.getByRole('link', { name: /Política e regulação\s*2/ })).toBeVisible();
  await expect(sub.locator('a.dd-mudo', { hasText: 'Tecnologia, IA e energia' })).toBeVisible();
  await sub.getByRole('link', { name: /Tecnologia, IA e energia/ }).click();
  await expect(page.getByText('Sem destaques relevantes hoje nesta editoria.')).toBeVisible();

  // Política e regulação: canal de transmissão e indicador de relevância.
  await page.locator('.chips-editoria a[href="#/noticias/politica_regulacao"]').click();
  await expect(page.getByText('fiscal → curva de juros')).toBeVisible();
  await expect(page.getByRole('img', { name: /Relevância: Mercado 3/ }).first()).toBeVisible();
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sobra).toBeLessThanOrEqual(0);
});
