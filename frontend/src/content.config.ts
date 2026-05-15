import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// As 6 categorias fixas + atalho "todas" (não é categoria real, é shortcut)
export const CATEGORIES = [
  'principais',
  'sobremesas',
  'datas',
  'vegetarianas',
  'congelar',
  'rapidas',
] as const;

export type Category = (typeof CATEGORIES)[number];

const recipes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/recipes' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // Categoria(s): aceita string OU array. Sempre normaliza pra array,
    // assim consumidores podem fazer .includes(slug) sem se preocupar com forma.
    // A primeira categoria é considerada a "principal" (usada como back link
    // padrão na página da receita).
    category: z.preprocess(
      (val) => Array.isArray(val) ? val : (val ? [val] : []),
      z.array(z.enum(CATEGORIES)).min(1, 'Adicione pelo menos uma categoria')
    ),
    time: z.number().int().positive(), // minutos
    // Decap salva campo number vazio como "" — e em alguns casos como -1
    // (default do Decap quando number field tem valueType: "int" e o user
    // limpa o campo). Pré-processa pra normalizar tudo isso pra undefined.
    servings: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        if (typeof val === 'number' && val <= 0) return undefined;
        return val;
      },
      z.number().int().positive().optional()
    ),
    difficulty: z.enum(['fácil', 'médio', 'difícil']).default('médio'),
    tags: z.array(z.string()).default([]),
    unitSystem: z.enum(['metric', 'imperial']).default('metric'),
    media: z.array(z.object({
      type: z.enum(['image', 'video']),
      src: z.string().optional(),
      url: z.string().optional(),
      alt: z.string().optional(),
      cover: z.boolean().optional(),
    }).transform(m => ({ ...m, src: m.url || m.src || '' })))
      .default([]),
    // Aceita tanto formato legado (array de strings) quanto novo do Decap
    // com `field` definido (array de objetos { item: string }). Normaliza
    // pra array de strings no transform.
    ingredients: z.array(z.union([z.string(), z.object({ item: z.string() })]))
      .default([])
      .transform(arr => arr.map(x => typeof x === 'string' ? x : x.item)),
    materials: z.array(z.union([z.string(), z.object({ item: z.string() })]))
      .default([])
      .transform(arr => arr.map(x => typeof x === 'string' ? x : x.item)),
    steps: z.array(z.union([z.string(), z.object({ item: z.string() })]))
      .default([])
      .transform(arr => arr.map(x => typeof x === 'string' ? x : x.item)),
    notes: z.string().optional(),
    published: z.boolean().default(true),
    publishedAt: z.coerce.date(),
    lang: z.string().default('pt-br'),
  }),
});

export const collections = { recipes };
