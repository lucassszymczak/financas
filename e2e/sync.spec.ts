import { expect, test, type BrowserContext, type Page } from '@playwright/test';

/** GitHub simulado: um único Gist guardado em memória, compartilhado pelos dois "aparelhos". */
function githubFalso() {
  const gists = new Map<string, { description: string; files: Record<string, { content: string }> }>();
  let n = 0;
  return {
    gists,
    async instalar(ctx: BrowserContext) {
      await ctx.route('https://api.github.com/**', async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (req.headers()['authorization'] !== 'Bearer ghp_chave_de_teste_1234567890')
          return route.fulfill({ status: 401, body: '{}' });
        const json = (b: unknown, status = 200) =>
          route.fulfill({
            status,
            contentType: 'application/json',
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(b),
          });
        if (url.pathname === '/gists' && req.method() === 'GET') {
          return json([...gists.entries()].map(([id, g]) => ({ id, description: g.description, files: g.files })));
        }
        if (url.pathname === '/gists' && req.method() === 'POST') {
          const corpo = req.postDataJSON();
          const id = `g${++n}`;
          gists.set(id, { description: corpo.description, files: corpo.files });
          return json({ id, files: corpo.files }, 201);
        }
        const id = url.pathname.split('/')[2]!;
        const g = gists.get(id);
        if (!g) return json({}, 404);
        if (req.method() === 'PATCH') {
          Object.assign(g.files, req.postDataJSON().files);
          return json({ id, files: g.files });
        }
        return json({ id, description: g.description, files: g.files });
      });
    },
  };
}

async function ativar(page: Page) {
  await page.goto('./#/config');
  await page.getByLabel('Chave do GitHub').fill('ghp_chave_de_teste_1234567890');
  await page.getByRole('button', { name: 'Ativar sincronização' }).click();
  await expect(page.getByText(/Sincronização ativa/)).toBeVisible();
}

test('sincroniza edições e configurações entre dois aparelhos', async ({ browser }) => {
  const gh = githubFalso();
  const celular = await browser.newContext();
  const pc = await browser.newContext();
  await gh.instalar(celular);
  await gh.instalar(pc);
  const a = await celular.newPage();
  const b = await pc.newPage();

  // Celular: carrega o exemplo e liga a sincronização (cria o Gist).
  await a.goto('./');
  await a.getByRole('button', { name: /Ver exemplo/ }).click();
  await expect(a.getByText('Datafolha: empate técnico')).toBeVisible();
  await ativar(a);
  expect(gh.gists.size).toBe(1);

  // Computador: liga com a mesma chave e recebe a edição.
  await ativar(b);
  await b.goto('./#/historico');
  await expect(b.getByText('Edições salvas (1)')).toBeVisible();

  // Computador carrega outra edição e muda o nome do app; o celular recebe as duas coisas.
  await b.getByTestId('input-arquivo').first().setInputFiles('e2e/fixtures/radar_2026-10-19.json');
  await expect(b.getByText('Edição de 19/10/2026 carregada.')).toBeVisible();
  await b.goto('./#/config');
  await b.getByLabel('Nome do app').fill('Radar do Lucas');
  await b.getByLabel('Nome do app').blur();
  await b.getByRole('button', { name: /Sincronizar agora/ }).click();
  await expect(b.getByText('Sincronização concluída.')).toBeVisible();

  await a.goto('./#/config');
  await a.getByRole('button', { name: /Sincronizar agora/ }).click();
  await expect(a.getByText('Sincronização concluída.')).toBeVisible();
  await expect(a.getByText(/2 edições salvas/)).toBeVisible();
  await expect(a.getByRole('link', { name: 'Oracle Capital · Radar do Lucas: ir para Hoje' })).toBeVisible();

  // Apagar no celular apaga no computador.
  await a.goto('./#/historico');
  await a.getByRole('button', { name: 'Apagar edição de 19/10/2026' }).click();
  await a.getByRole('button', { name: 'Apagar', exact: true }).click();
  await expect(a.getByText('Edições salvas (1)')).toBeVisible();
  await a.goto('./#/config');
  await a.getByRole('button', { name: /Sincronizar agora/ }).click();
  await expect(a.getByText('Sincronização concluída.')).toBeVisible();
  await b.getByRole('button', { name: /Sincronizar agora/ }).click();
  await expect(b.getByText(/1 edição salva/)).toBeVisible();

  await celular.close();
  await pc.close();
});

test('chave recusada mostra o erro em português', async ({ browser }) => {
  const gh = githubFalso();
  const ctx = await browser.newContext();
  await gh.instalar(ctx);
  const page = await ctx.newPage();
  await page.goto('./#/config');
  await page.getByLabel('Chave do GitHub').fill('ghp_chave_errada_000000000000');
  await page.getByRole('button', { name: 'Ativar sincronização' }).click();
  await expect(page.getByText(/O GitHub não aceitou a chave/)).toBeVisible();
  await ctx.close();
});
