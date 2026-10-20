// Baixa os logos listados em scripts/logos-fontes.json para public/logos/.
// Uso (só no seu computador, nunca no build nem no navegador): npm run logos:baixar
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const LIMITE = 10 * 1024;
const TIPOS = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/webp': 'webp' };
const pasta = new URL('../public/logos/', import.meta.url);
const fontes = JSON.parse(readFileSync(new URL('./logos-fontes.json', import.meta.url), 'utf8'));
const forcar = process.argv.includes('--forcar');

mkdirSync(pasta, { recursive: true });
let ok = 0;
let falhas = 0;

for (const [raiz, url] of Object.entries(fontes)) {
  if (raiz.startsWith('_') || !url) continue;
  if (!/^[A-Z0-9]{4}$/.test(raiz)) {
    console.warn(`✗ ${raiz}: a raiz deve ter 4 letras/números em maiúsculas`);
    falhas++;
    continue;
  }
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const tipo = (r.headers.get('content-type') ?? '').split(';')[0].trim();
    const ext = TIPOS[tipo] ?? url.split('?')[0].split('.').pop()?.toLowerCase();
    if (!['svg', 'png', 'webp'].includes(ext)) throw new Error(`formato não aceito (${tipo || ext})`);
    const dados = Buffer.from(await r.arrayBuffer());
    if (dados.length > LIMITE) throw new Error(`${Math.round(dados.length / 1024)} KB (máximo 10 KB)`);
    const destino = new URL(`${raiz}.${ext}`, pasta);
    if (existsSync(destino) && !forcar) {
      console.log(`• ${raiz}.${ext} já existe (use --forcar para substituir)`);
      continue;
    }
    writeFileSync(destino, dados);
    console.log(`✓ ${raiz}.${ext} (${(dados.length / 1024).toFixed(1)} KB)`);
    ok++;
  } catch (e) {
    console.warn(`✗ ${raiz}: ${e instanceof Error ? e.message : e}`);
    falhas++;
  }
}

console.log(`\n${ok} logo(s) salvos em public/logos/, ${falhas} falha(s). Rode \`npm run build\` para o app reconhecer.`);
