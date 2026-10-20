/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const pacote = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

const PASTA_LOGOS = new URL('./public/logos/', import.meta.url);
const LISTA_LOGOS = new URL('./src/data/logos-disponiveis.ts', import.meta.url);
const ARQUIVO_LOGO = /^([A-Z0-9]{4})\.(svg|png|webp)$/i;

/** Arquivos de logo na pasta (RAIZ → arquivo). Se houver mais de um formato, vale svg, depois webp, depois png. */
function lerLogos(): Record<string, string> {
  if (!existsSync(PASTA_LOGOS)) return {};
  const ordem = { svg: 0, webp: 1, png: 2 } as Record<string, number>;
  const logos: Record<string, string> = {};
  for (const f of readdirSync(PASTA_LOGOS).sort()) {
    const m = ARQUIVO_LOGO.exec(f);
    if (!m) continue;
    const raiz = m[1]!.toUpperCase();
    const atual = logos[raiz];
    if (!atual || ordem[m[2]!.toLowerCase()]! < ordem[atual.split('.').pop()!.toLowerCase()]!) logos[raiz] = f;
  }
  return logos;
}

/**
 * Gera `src/data/logos-disponiveis.ts` com os logos que existem em `public/logos/`,
 * para o app saber quais existem sem tentar carregar (e sem imagem quebrada).
 */
function listaLogos(): Plugin {
  const gerar = () => {
    const logos = lerLogos();
    const corpo = Object.entries(logos)
      .map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`)
      .join('\n');
    const fonte = `// Gerado automaticamente pelo build (plugin "radar-logos" no vite.config.ts) a partir de public/logos/.
// Não edite à mão: coloque o arquivo na pasta e rode \`npm run dev\` ou \`npm run build\`.
export const LOGOS_DISPONIVEIS: Record<string, string> = {${corpo ? `\n${corpo}\n` : ''}};
`;
    const antes = existsSync(LISTA_LOGOS) ? readFileSync(LISTA_LOGOS, 'utf8') : '';
    if (antes !== fonte) writeFileSync(LISTA_LOGOS, fonte);
  };
  return {
    name: 'radar-logos',
    buildStart: gerar,
    configureServer(server) {
      const pasta = PASTA_LOGOS.pathname;
      server.watcher.add(pasta);
      const mudou = (f: string) => f.startsWith(pasta) && gerar();
      server.watcher.on('add', mudou);
      server.watcher.on('unlink', mudou);
    },
  };
}

/**
 * Gera o service worker com a lista de arquivos do build.
 * Os dados ficam no IndexedDB; o service worker só guarda os arquivos do site,
 * para o app abrir sem internet.
 */
function serviceWorker(): Plugin {
  return {
    name: 'radar-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const assets = [
        './',
        './manifest.webmanifest',
        './icon.svg',
        './icon-192.png',
        './icon-512.png',
        './icon-maskable-512.png',
        // Logos de public/logos/ (as bandeiras já vêm no bundle, em `files`).
        ...Object.values(lerLogos()).map((f) => `./logos/${f}`),
        ...files.map((f) => `./${f}`),
      ];
      const version = Date.now().toString(36);
      const source = `const CACHE = 'radar-' + ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./', { ignoreSearch: true })));
    return;
  }
  event.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req)));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  // Caminho relativo: funciona no GitHub Pages (subpasta /nome-do-repositorio/) sem ajuste.
  base: './',
  define: { __VERSAO__: JSON.stringify(pacote.version) },
  plugins: [react(), listaLogos(), serviceWorker()],
  build: { target: 'es2022' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
