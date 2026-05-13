# Cozy Corner — recipes by Gigi

Site pessoal de receitas com intro narrativa (cover escura → wipe → hero logo → cozinha ilustrada) e admin restrito.

## Estrutura

```
.
├── mockup-v1/      ← snapshot do mockup HTML/CSS/JS (v1 finalizada)
├── mockup/         ← versão de trabalho original (referência)
└── frontend/       ← projeto Astro (em construção)
```

## Stack

- **Astro** — framework estático, suporte nativo a i18n
- **Decap CMS** — admin via GitHub OAuth, restrito ao dono
- **Cloudflare Pages** — publicação (free tier)
- **GSAP + Lenis** — animações scroll-driven (intro + morph do logo)

## Categorias (cozinha)

6 categorias + 1 atalho + 1 contato:
1. Pratos principais (prato na bancada)
2. Sobremesas (doce na bancada)
3. Vegetarianas (vaso com planta)
4. Receitas rápidas (relógio na parede)
5. Para congelar (parte de cima da geladeira)
6. Datas comemorativas (calendário na porta)
- Todas as receitas (atalho, pilha de livros)
- Deixe seu recado (modal de contato, post-it)

## Idiomas

PT-BR é o idioma principal. Infraestrutura preparada pra adicionar outras línguas (Astro i18n nativo).

## Dev local

```bash
cd frontend
npm install
npm run dev
```
