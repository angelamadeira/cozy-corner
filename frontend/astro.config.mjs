// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://cozycorner.recipes', // troca quando definir o domínio final
  // i18n nativo do Astro — começa só com pt-br, fácil adicionar outras línguas depois
  i18n: {
    defaultLocale: 'pt-br',
    locales: ['pt-br'],
    routing: {
      // PT-BR fica na raiz (/), outras línguas viriam com prefixo (/en/, etc.)
      prefixDefaultLocale: false,
    },
  },
  build: {
    format: 'directory', // gera /receitas/risoto/index.html, amigável pra Cloudflare
  },
});
