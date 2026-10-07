import { test, expect } from '@playwright/test';

// OCR real com Tesseract servido pelo próprio site. Recibo fictício.
test('lê um print de comprovante com OCR local', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const gerador = await browser.newPage({ viewport: { width: 600, height: 700 } });
  await gerador.setContent(`
    <body style="margin:0;background:#fff;font-family:Arial,sans-serif;font-size:28px;line-height:1.5;padding:30px;color:#000">
      <div>FARMACIA CENTRAL LTDA</div>
      <div>CNPJ: 11.222.333/0001-81</div>
      <div>Data: 05/10/2026</div>
      <div>DIPIRONA 1 UN 12,90</div>
      <div>VALOR TOTAL R$ 42,50</div>
      <div>Cartao de debito</div>
    </body>`);
  const png = await gerador.screenshot();
  await gerador.close();

  const externas: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://localhost') && !u.startsWith('blob:') && !u.startsWith('data:')) externas.push(u);
  });

  await page.goto('./');
  await page.getByLabel('Escolher prints e fotos').setInputFiles({ name: 'print.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('heading', { name: /Revisão \(1 de 1\)/ })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('textbox', { name: 'Valor' })).toHaveValue('42,50');
  await expect(page.getByRole('textbox', { name: 'Estabelecimento' })).toHaveValue(/FARMACIA CENTRAL/);
  await expect(page.getByText('CNPJ', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Categoria' })).toHaveValue('Farmácia');
  expect(externas).toEqual([]);
});
