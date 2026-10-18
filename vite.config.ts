/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pacote = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

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
  plugins: [react(), serviceWorker()],
  build: { target: 'es2022' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
