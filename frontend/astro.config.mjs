// @ts-check
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';

// Vite plugin: resolve /admin/ → /admin/index.html no dev server
// (em produção isso é feito pelo host estático). Necessário pro Decap admin.
const staticIndexFallback = {
  name: 'static-index-fallback',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/admin' || req.url === '/admin/') {
        req.url = '/admin/index.html';
      }
      next();
    });
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://cozycorner.recipes', // troca quando definir o domínio final
  integrations: [
    // Line-art icons via Iconify (Phosphor "thin" + outras libs conforme necessário)
    icon(),
  ],
  // i18n: client-side toggle (PT default, EN via localStorage/JS).
  // Mantemos só pt-br como locale nativo do Astro pra não duplicar rotas.
  i18n: {
    defaultLocale: 'pt-br',
    locales: ['pt-br'],
    routing: { prefixDefaultLocale: false },
  },
  build: {
    format: 'directory', // gera /receitas/risoto/index.html, amigável pra Cloudflare
  },
  vite: {
    plugins: [staticIndexFallback],
  },
});
