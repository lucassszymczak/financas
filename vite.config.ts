/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Gera o service worker com a lista de arquivos do build.
 * Só faz cache dos arquivos do site; os arquivos do OCR entram no cache
 * na primeira vez em que forem usados.
 */
function serviceWorker(): Plugin {
  return {
    name: 'plano-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      // Fontes .woff (sem 2) só servem a navegadores antigos: ficam fora do cache inicial.
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && !f.endsWith('.woff'));
      const assets = ['./', ...files.map((f) => `./${f}`)];
      const version = Date.now().toString(36);
      const source = `const VERSION = ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
const CACHE = 'site-' + VERSION;
const OCR_CACHE = 'ocr-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== OCR_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./', { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
    );
    return;
  }

  if (url.pathname.includes('/ocr/')) {
    event.respondWith(
      caches.open(OCR_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  // Caminho relativo: funciona no GitHub Pages (subpasta) e no Cloudflare Pages (raiz).
  base: './',
  plugins: [react(), serviceWorker()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
