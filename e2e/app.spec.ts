import { expect, test, type Page } from '@playwright/test';

const ABAS = [
  'hoje',
  'mercado',
  'mercado/setores',
  'mercado/acoes',
  'renda-fixa',
  'renda-fixa/di',
  'agro',
  'agro/guarapuava',
  'clima',
  'agenda',
  'calculadoras',
  'historico',
  'config',
];

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
  await expect(page.getByRole('heading', { name: 'Termômetro', exact: true })).toBeVisible();
  // Identidade Oracle Capital: assinatura no topo, títulos em Source Serif 4, texto em Source Sans 3, cantos retos.
  await expect(page.getByRole('link', { name: 'Oracle Capital · Radar de Investimentos: ir para Hoje' })).toBeVisible();
  const estilo = await page.evaluate(() => ({
    titulo: getComputedStyle(document.querySelector('.migalha h1')!).fontFamily,
    texto: getComputedStyle(document.body).fontFamily,
    faixa: getComputedStyle(document.querySelector('.topo')!).backgroundColor,
    cantos: getComputedStyle(document.querySelector('.termometro')!).borderRadius,
  }));
  expect(estilo.titulo).toContain('Source Serif 4');
  expect(estilo.texto).toContain('Source Sans 3');
  expect(estilo.cantos).toBe('0px');
  // Leituras em destaque logo depois do termômetro, antes de alertas, KPIs e notícias.
  const painel = page.locator('.painel-leituras');
  await expect(painel.getByRole('heading', { name: 'Leituras do dia' })).toBeVisible();
  await expect(painel.getByRole('link', { name: /No campo/ })).toHaveAttribute('href', '#/clima');
  await expect(painel.getByRole('link', { name: /Guarapuava/ })).toBeVisible();
  const ordem = await page.evaluate(() =>
    ['.termometro', '.painel-leituras', '.kpis', '.lista-cards'].map(
      (s) => document.querySelector(s)!.getBoundingClientRect().top,
    ),
  );
  expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
  // Logo e título da página aparecem inteiros (sem reticências), também no celular.
  const cortados = await page.evaluate(
    () => [...document.querySelectorAll('.logo, .migalha h1, .migalha-ref')].filter((e) => e.scrollWidth > e.clientWidth).length,
  );
  expect(cortados).toBe(0);
  await expect(page.locator('.migalha h1')).toHaveText('Radar de 16/10');
  // Fita: começa pelos principais (Ibovespa) e tem o seletor com setores e categorias.
  await expect(page.locator('.fita-item').first()).toContainText('IBOV');
  await expect(page.getByLabel('O que mostrar na fita')).toHaveValue('principais');
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
  await expect(page.locator('#grupo-w-Blue-chips').getByRole('button', { name: 'Petrobras PN: ver detalhes' })).toContainText(
    'sem preço',
  );
  await blue.click();
  await expect(blue).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#grupo-w-Blue-chips').getByRole('button', { name: 'Petrobras PN: ver detalhes' })).toHaveCount(0);
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
  await expect(page.locator('#grupo-w-Blue-chips').getByRole('button', { name: 'Petrobras PN: ver detalhes' })).toContainText(
    '30,12',
  );
});

test('detalhe do ativo pelo ticker: gráfico, estatísticas e notícias', async ({ page }) => {
  await carregarExemplo(page);
  await page
    .getByTestId('input-arquivo')
    .first()
    .setInputFiles(['e2e/fixtures/radar_2026-10-19.json', 'e2e/fixtures/radar_2026-10-20.json']);
  await expect(page.getByText('2 edições carregadas.')).toBeVisible();
  // A fita está sempre rolando: o foco do teclado segura o item; Enter para a fita nele e abre o detalhe.
  await page.locator('.fita-item').first().focus();
  await page.keyboard.press('Enter');
  const det = page.getByRole('dialog');
  await expect(page.locator('.fita-selo')).toHaveText('Parada em IBOV');
  await expect(page.locator('.fita-item.sel').first()).toContainText('IBOV');
  await expect(det.getByRole('heading', { name: 'Ibovespa' })).toBeVisible();
  await expect(det.locator('.grafico canvas')).toBeVisible();
  await expect(det.getByText('Mínimo · máximo')).toBeVisible();
  await expect(det.getByText('Edições com dado')).toBeVisible();
  await expect(det.getByText('No Radar de hoje')).toBeVisible();
  await expect(det.getByText('Datafolha: empate técnico')).toBeVisible();
  await det.getByRole('button', { name: '7d' }).click();
  await expect(det.locator('.grafico canvas')).toBeVisible();
  await semRolagemHorizontal(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.fita-item.sel')).toHaveCount(0);
});

test('busca no universo amplo de cotações e mostra os dados do pregão', async ({ page }) => {
  await carregarExemplo(page);
  await page.getByTestId('input-arquivo').first().setInputFiles('e2e/fixtures/radar_2026-10-20.json');
  await expect(page.getByText('Edição de 20/10/2026 carregada.')).toBeVisible();
  await page.goto('./#/mercado');
  await page.getByLabel('Buscar ativo', { exact: true }).fill('wege');
  await expect(page.getByRole('button', { name: /Resultados \(1\)/ })).toBeVisible();
  await page.getByRole('button', { name: 'WEG ON: ver detalhes' }).click();
  const det = page.getByRole('dialog');
  await expect(det.getByText('Volume financeiro')).toBeVisible();
  await expect(det.getByText('R$ 612,0 mi')).toBeVisible();
  await expect(det.getByText('Faixa de 52 semanas')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Buscar ativo', { exact: true }).fill('');
  // A watchlist passa a mostrar ativos que vieram só no bloco amplo.
  await expect(page.getByRole('button', { name: 'Small Caps: ver detalhes' })).toBeVisible();
  // A fita "Principais" continua só com o Radar curado; "Todas as ações" traz o bloco amplo.
  await expect(page.locator('.fita-item', { hasText: 'WEGE3' })).toHaveCount(0);
  await page.getByLabel('O que mostrar na fita').selectOption('acoes');
  await expect(page.locator('.fita-item', { hasText: 'WEGE3' }).first()).toBeAttached();
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

test('menu superior, busca do topo, setores e fita', async ({ page }, info) => {
  const celular = info.project.name === 'celular';
  await carregarExemplo(page);
  await page.getByTestId('input-arquivo').first().setInputFiles('e2e/fixtures/radar_2026-10-20.json');
  await expect(page.getByText('Edição de 20/10/2026 carregada.')).toBeVisible();

  // Menu: no celular o ☰ abre a lista em tela cheia; no computador o submenu abre ao passar o mouse.
  if (celular) await page.getByRole('button', { name: 'Abrir menu' }).click();
  const mercado = page.getByRole('button', { name: 'Mercado', exact: true });
  if (celular) await mercado.click();
  else await mercado.hover();
  const sub = page.locator('#submenu-mercado');
  await expect(sub.getByRole('link', { name: /Índices globais/ })).toContainText('6');
  await sub.getByRole('link', { name: /^Ações/ }).click();
  await expect(page).toHaveURL(/#\/mercado\/acoes$/);
  await expect(page.locator('.migalha h1')).toHaveText('Ações');
  if (!celular) await expect(mercado).toHaveClass(/ativo/);
  // Chips de setor filtram a tabela de ações.
  await page.getByRole('button', { name: 'Bens industriais' }).click();
  await expect(page.locator('.tabela-ativos tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await semRolagemHorizontal(page);

  // Setores: cartões com média e a tabela do setor, ordenável.
  if (celular) await page.getByRole('button', { name: 'Abrir menu' }).click();
  const setores = page.getByRole('button', { name: 'Setores', exact: true });
  if (celular) await setores.click();
  else await setores.hover();
  await expect(page.locator('#submenu-setores').getByRole('link', { name: /Financeiro/ })).toContainText('−1,22%');
  await page
    .locator('#submenu-setores')
    .getByRole('link', { name: /Financeiro/ })
    .click();
  await expect(page.locator('.migalha h1')).toHaveText('Financeiro');
  await expect(page.locator('.setor', { hasText: 'Financeiro' })).toContainText('3 ações');
  await expect(page.locator('.setor', { hasText: 'Financeiro' })).toContainText('▼ 3');
  const linhas = page.locator('.tabela-ativos tbody tr');
  await expect(linhas).toHaveCount(3);
  await page.getByRole('button', { name: /Variação/ }).click();
  await expect(linhas.first()).toContainText('BBDC4');
  await page.getByRole('button', { name: /Variação/ }).click();
  await expect(linhas.first()).toContainText('BBAS3');
  await semRolagemHorizontal(page);

  // Busca do topo: ativos (inclusive do bloco amplo) e setores.
  const busca = page.getByLabel('Buscar ativo, setor ou índice');
  await busca.fill('financ');
  await expect(page.getByRole('listbox').getByRole('option', { name: /SETOR.*Financeiro/ })).toBeVisible();
  await busca.fill('wege');
  await page.getByRole('listbox').getByRole('option', { name: /WEGE3/ }).click();
  await expect(page.getByRole('dialog').getByText('Volume financeiro')).toBeVisible();
  await page.keyboard.press('Escape');

  // Fita: clique sem arrastar para nela e abre o detalhe; fechar faz voltar a rodar.
  await page.getByLabel('O que mostrar na fita').selectOption('setor:Financeiro');
  await expect(page.locator('.fita-item').first()).toContainText('ITUB4');
  await page.evaluate(() => window.scrollTo(0, 0));
  const caixa = (await page.locator('.fita-item').first().boundingBox())!;
  // No celular, toque; no computador, clique.
  if (celular) await page.touchscreen.tap(caixa.x + 8, caixa.y + caixa.height / 2);
  else await page.mouse.click(caixa.x + 8, caixa.y + caixa.height / 2);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.fita-selo')).toHaveText(/^Parada em /);
  await expect(page.locator('.fita-item.sel').first()).toBeAttached();
  await page.keyboard.press('Escape');
  await expect(page.locator('.fita-item.sel')).toHaveCount(0);
});
