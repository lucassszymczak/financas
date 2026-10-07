import { test, expect } from '@playwright/test';

const OFX = `OFXHEADER:100
DATA:OFXSGML

<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20261005
<TRNAMT>-87.00
<MEMO>POSTO EXEMPLO
</STMTTRN>
<STMTTRN>
<DTPOSTED>20261006
<TRNAMT>-1000.00
<MEMO>PAGAMENTO DE FATURA
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

test('importa OFX: fatura chega desmarcada', async ({ page }) => {
  await page.goto('./');
  await page
    .getByLabel('Escolher extrato (OFX, CSV ou PDF)')
    .setInputFiles({ name: 'extrato.ofx', mimeType: 'application/x-ofx', buffer: Buffer.from(OFX) });
  await expect(page.getByRole('heading', { name: /Revisão \(1 de 2\)/ })).toBeVisible();
  await expect(page.getByText('Pagamento de fatura', { exact: true })).toBeVisible();
});

test('CSV sem colunas reconhecíveis abre o mapeamento', async ({ page }) => {
  await page.goto('./');
  const csv = 'quando;onde;quanto\n05-10-2026;Loja A;10\n06-10-2026;Loja B;20\n';
  await page
    .getByLabel('Escolher extrato (OFX, CSV ou PDF)')
    .setInputFiles({ name: 'banco.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByRole('heading', { name: 'Colunas do CSV' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Valor', exact: true }).selectOption('2');
  await page.getByRole('combobox', { name: 'Descrição' }).selectOption('1');
  await page.getByLabel('Valores positivos são gastos').check();
  await page.getByLabel('Nome do banco').fill('Banco Teste');
  await page.getByRole('button', { name: 'Usar estas colunas' }).click();
  await expect(page.getByRole('heading', { name: /Revisão \(2 de 2\)/ })).toBeVisible();
});

test('PDF com texto', async ({ page, browser }) => {
  const gerador = await browser.newPage();
  await gerador.setContent(
    '<pre style="font-size:14px">05/10/2026 UBER TRIP 23,90\n06/10/2026 FARMACIA CENTRAL 42,50\nSALDO 100,00</pre>',
  );
  const pdf = await gerador.pdf();
  await gerador.close();
  await page.goto('./');
  await page
    .getByLabel('Escolher extrato (OFX, CSV ou PDF)')
    .setInputFiles({ name: 'fatura.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.getByRole('heading', { name: /Revisão \(2 de 2\)/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Farmácia/).first()).toBeVisible();
});
